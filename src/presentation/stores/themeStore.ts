/**
 * Theme Store — Zustand + persist
 *
 * Supports 'light' | 'dark' | 'system' and syncs the resolved
 * effective theme to <html data-theme="..."> for CSS selectors.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  resolved: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolve(theme: Theme): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolved: getSystemTheme(),
      setTheme: (theme) => set({ theme, resolved: resolve(theme) }),
      toggle: () => {
        const next = get().resolved === 'dark' ? 'light' : 'dark';
        get().setTheme(next);
      },
    }),
    {
      name: 'aha-theme',
    },
  ),
);

/** React hook that keeps <html data-theme> in sync with the store. */
export function useThemeEffect() {
  const theme = useThemeStore((s) => s.theme);
  const resolved = useThemeStore((s) => s.resolved);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolved);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        useThemeStore.setState({ resolved: e.matches ? 'dark' : 'light' });
      }
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, resolved]);
}
