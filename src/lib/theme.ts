'use client';

export type ThemeMode = 'light' | 'dark' | 'sensory';

const THEME_KEY = 'masar.theme.v1';

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return (localStorage.getItem(THEME_KEY) as ThemeMode) || 'light';
}

export function applyTheme(theme: ThemeMode) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_KEY, theme);

  const root = document.documentElement;
  root.classList.remove('dark', 'sensory-mode');

  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'sensory') {
    root.classList.add('sensory-mode');
  }
}
