'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun, Eye } from 'lucide-react';
import { applyTheme, getStoredTheme, type ThemeMode } from '@/lib/theme';

export default function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    const active = getStoredTheme();
    setTheme(active);
    applyTheme(active);
  }, []);

  const cycleTheme = () => {
    const next: ThemeMode = theme === 'light' ? 'dark' : theme === 'dark' ? 'sensory' : 'light';
    setTheme(next);
    applyTheme(next);
  };

  const icons = {
    light: <Sun size={17} className="text-amber-500" />,
    dark: <Moon size={17} className="text-indigo-400" />,
    sensory: <Eye size={17} className="text-teal-500" />,
  };

  const labels = {
    light: 'الوضع النهاري',
    dark: 'الوضع الليلي',
    sensory: 'نمط إدراك حسّي',
  };

  return (
    <button
      onClick={cycleTheme}
      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 text-xs font-black text-slate-700 transition"
      title={`النمط الحالي: ${labels[theme]} (اضغط للتغيير)`}
    >
      {icons[theme]}
      <span className="hidden md:inline">{labels[theme]}</span>
    </button>
  );
}
