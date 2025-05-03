// src/hooks/useTheme.ts
import { useEffect } from 'react';
import { useThemeStore } from '../store/themeStore';

export const useTheme = () => {
  const { theme } = useThemeStore();

  useEffect(() => {
    const root = window.document.documentElement;

    const applyTheme = (mode: 'light' | 'dark') => {
      if (mode === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      applyTheme(isDark ? 'dark' : 'light');

      const listener = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? 'dark' : 'light');
      };

      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', listener);

      return () => mq.removeEventListener('change', listener);
    } else {
      applyTheme(theme);
    }
  }, [theme]);
};
