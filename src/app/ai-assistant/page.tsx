'use client';

import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MasarAIAssistant from '@/components/MasarAIAssistant';

export default function AIAssistantPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 flex flex-col" dir="rtl">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar desktopOnly />
        <main className="flex-1 flex flex-col h-[calc(100vh-65px)] overflow-hidden">
          <MasarAIAssistant mode="full" branch="IKHLAS_JEDDAH" />
        </main>
      </div>
    </div>
  );
}