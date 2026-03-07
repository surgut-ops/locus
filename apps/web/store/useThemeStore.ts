'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

type ThemeStore = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
  setResolvedTheme: (theme: 'light' | 'dark') => void;
};

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: (theme) =>
        set((state) => {
          const resolved = theme === 'system' ? getSystemTheme() : theme;
          if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', resolved === 'dark');
          }
          return { theme, resolvedTheme: resolved };
        }),
      setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
    }),
    { name: 'locus-theme' },
  ),
);
