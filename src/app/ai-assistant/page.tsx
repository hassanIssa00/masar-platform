'use client';

import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MasarAIAssistant from '@/components/MasarAIAssistant';
import PageReportButton from '@/components/PageReportButton';

export default function AIAssistantPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 flex flex-col" dir="rtl">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar desktopOnly />
        <main className="flex-1 flex flex-col h-[calc(100vh-65px)] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-2 bg-white border-b border-slate-200/80 shrink-0">
            <span className="text-xs font-black text-slate-700">مساعد مسار الذكي (د. إسماعيل عيسى)</span>
            <PageReportButton tabKey="aiAssistant" label="تقرير الذكاء الاصطناعي (PDF)" variant="primary" size="sm" />
          </div>
          <MasarAIAssistant mode="full" branch="IKHLAS_JEDDAH" />
        </main>
      </div>
    </div>
  );
}