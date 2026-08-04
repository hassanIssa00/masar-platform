'use client';

import { useState } from 'react';
import { Lightbulb, Target, Rocket, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface FeatureGuideBannerProps {
  title: string;
  description: string;
  benefits: string[];
  modernShift: string;
}

export default function FeatureGuideBanner({
  title,
  description,
  benefits,
  modernShift,
}: FeatureGuideBannerProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50/80 via-white to-sky-50/60 p-5 shadow-xs space-y-4 text-right" dir="rtl">
      
      {/* Header Bar */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-600 text-white shadow-xs">
            <Sparkles size={20} />
          </span>
          <div>
            <h2 className="font-black text-slate-900 text-base flex items-center gap-2">
              الدليل الشامل وأهمية النظام الرقمي الحديث: <span className="text-teal-700">{title}</span>
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-0.5 leading-relaxed">
              كيف يساهم هذا النظام في تسريع معدل تحسن الطفل ونقل الجلسات إلى أعلى المقاييس العالمية
            </p>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50 transition shrink-0"
        >
          {expanded ? (
            <>
              <span>إخفاء الشرح</span>
              <ChevronUp size={15} />
            </>
          ) : (
            <>
              <span>عرض الدليل الكامل</span>
              <ChevronDown size={15} />
            </>
          )}
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="grid gap-4 sm:grid-cols-3 pt-2 border-t border-teal-100/80">
          
          {/* Section 1: Detailed Overview */}
          <div className="rounded-xl bg-white p-4 border border-teal-100 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 text-teal-800 font-black text-xs">
              <Lightbulb size={16} className="text-teal-600" />
              <span>💡 ما هو هذا النظام وكيف يعمل؟</span>
            </div>
            <p className="text-xs font-bold text-slate-600 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Section 2: Core Benefits */}
          <div className="rounded-xl bg-white p-4 border border-teal-100 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 text-teal-800 font-black text-xs">
              <Target size={16} className="text-amber-500" />
              <span>🎯 الفائدة والأثر العملي المباشر</span>
            </div>
            <ul className="space-y-1.5 text-xs font-bold text-slate-600">
              {benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-teal-600 font-black">✓</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Section 3: Modern Educational Shift */}
          <div className="rounded-xl bg-white p-4 border border-teal-100 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 text-teal-800 font-black text-xs">
              <Rocket size={16} className="text-indigo-600" />
              <span>🚀 التحول الرقمي والتأهيل الحديث</span>
            </div>
            <p className="text-xs font-bold text-slate-600 leading-relaxed">
              {modernShift}
            </p>
          </div>

        </div>
      )}

    </div>
  );
}
