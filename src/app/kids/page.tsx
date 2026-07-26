'use client';

export default function KidsDashboard() {
  const level = 1;
  const coins = 150;

  return (
    <div className="min-h-screen bg-sky-50 overflow-hidden flex flex-col relative" dir="rtl">
      {/* Top HUD (Heads Up Display) */}
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-start z-10 pointer-events-none">
        
        {/* Left Side: Avatar & Level */}
        <div className="flex gap-4 items-center pointer-events-auto">
          <div className="relative">
            <div className="w-20 h-20 bg-white rounded-full border-4 border-primary shadow-lg flex items-center justify-center text-4xl">
              🦉
            </div>
            <div className="absolute -bottom-2 -right-2 bg-accent text-white font-black text-lg px-3 py-1 rounded-full border-2 border-white shadow-md">
              مستوى {level}
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-sm border border-white flex gap-3 items-center">
            <span className="text-3xl">🪙</span>
            <span className="text-2xl font-black text-secondary-dark">{coins}</span>
          </div>
        </div>

        {/* Right Side: Settings / Pause */}
        <div className="pointer-events-auto flex gap-4">
          <button className="w-14 h-14 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl shadow-sm border border-white hover:scale-110 transition-transform">
            🗺️
          </button>
          <button className="w-14 h-14 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center text-2xl shadow-sm border border-white hover:scale-110 transition-transform">
            ⚙️
          </button>
        </div>
      </header>

      {/* The Map Area (Simplified for Prototype) */}
      <main className="flex-1 relative flex items-center justify-center">
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')]"></div>
        <div className="absolute bottom-0 w-full h-1/3 bg-gradient-to-t from-green-200 to-transparent"></div>

        {/* The Path */}
        <div className="relative w-full max-w-4xl h-[600px] flex items-center justify-center">
          
          {/* Node 1: Completed */}
          <div className="absolute top-20 right-20 flex flex-col items-center group">
            <button className="w-24 h-24 bg-primary text-white rounded-full border-4 border-white shadow-xl flex items-center justify-center text-4xl hover:-translate-y-2 transition-transform relative z-10">
              ⭐
            </button>
            <div className="mt-4 bg-white px-4 py-2 rounded-full font-black text-gray-700 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
              الحروف
            </div>
            {/* Path line to next node */}
            <svg className="absolute top-1/2 right-1/2 w-64 h-32 -z-10 text-primary opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0,0 Q50,100 100,50" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="8 8"/>
            </svg>
          </div>

          {/* Node 2: Current / Active */}
          <div className="absolute top-40 right-[40%] flex flex-col items-center group">
            {/* Mascot indicator above active node */}
            <div className="absolute -top-16 animate-bounce text-4xl">🦉</div>
            <button className="w-28 h-28 bg-accent text-white rounded-full border-4 border-white shadow-2xl flex items-center justify-center text-5xl hover:scale-110 transition-transform animate-pulse relative z-10">
              ▶️
            </button>
            <div className="mt-4 bg-white px-6 py-2 rounded-full font-black text-accent shadow-sm">
              الأصوات
            </div>
            {/* Path line to next node */}
            <svg className="absolute top-1/2 right-1/2 w-64 h-48 -z-10 text-gray-300" viewBox="0 0 100 100" preserveAspectRatio="none">
              <path d="M0,0 Q50,100 100,0" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="8 8"/>
            </svg>
          </div>

          {/* Node 3: Locked */}
          <div className="absolute top-20 left-20 flex flex-col items-center group opacity-60 grayscale cursor-not-allowed">
            <button className="w-20 h-20 bg-gray-300 text-gray-500 rounded-full border-4 border-white shadow-md flex items-center justify-center text-3xl z-10 cursor-not-allowed">
              🔒
            </button>
            <div className="mt-4 bg-white px-4 py-2 rounded-full font-black text-gray-400 shadow-sm">
              الكلمات
            </div>
          </div>

        </div>
      </main>
      
      {/* Daily Mission Overlay (Gamification) */}
      <div className="absolute bottom-8 right-8 bg-white p-4 rounded-2xl shadow-xl border-2 border-secondary flex items-center gap-4 animate-slide-up hover:scale-105 transition-transform cursor-pointer">
        <div className="text-4xl">🎁</div>
        <div>
          <div className="font-black text-gray-800">مهمة اليوم</div>
          <div className="text-sm font-bold text-gray-500 mt-1">أنهِ درسين واحصل على 50🪙</div>
          {/* Progress Bar */}
          <div className="w-full h-3 bg-gray-100 rounded-full mt-2 overflow-hidden">
            <div className="h-full bg-secondary w-1/2"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
