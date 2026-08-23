'use client';

export type ThemeMode = 'light' | 'dark' | 'sensory';

let activeTheme: ThemeMode = 'light';

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return activeTheme;
}

export function applyTheme(theme: ThemeMode) {
  if (typeof window === 'undefined') return;
  activeTheme = theme;

  const root = document.documentElement;
  root.classList.remove('dark', 'sensory-mode');

  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'sensory') {
    root.classList.add('sensory-mode');
  }
}
