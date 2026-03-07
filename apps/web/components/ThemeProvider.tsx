'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { useThemeStore } from '../store/useThemeStore';

function getResolvedTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  if (theme === 'system') {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useThemeStore((s) => s.theme);
  const setResolvedTheme = useThemeStore((s) => s.setResolvedTheme);

  useEffect(() => {
    const resolved = getResolvedTheme(theme);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
    setResolvedTheme(resolved);
  }, [theme, setResolvedTheme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') {
        const resolved = mq.matches ? 'dark' : 'light';
        document.documentElement.classList.toggle('dark', resolved === 'dark');
        setResolvedTheme(resolved);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, setResolvedTheme]);

  return <>{children}</>;
}
