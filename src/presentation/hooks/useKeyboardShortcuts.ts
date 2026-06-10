/**
 * Global keyboard shortcuts for AHA.
 */

import { useEffect } from 'react';
import { useAppStore, useTemporalStore } from '@presentation/stores/appStore';
import { useThemeStore } from '@presentation/stores/themeStore';

export function useKeyboardShortcuts() {
  const temporal = useTemporalStore();
  const openSearch = useAppStore((s) => s.openSearch);
  const closeSearch = useAppStore((s) => s.closeSearch);
  const openExport = useAppStore((s) => s.openExport);
  const closeExport = useAppStore((s) => s.closeExport);
  const closeSummary = useAppStore((s) => s.closeSummary);
  const closeAISettings = useAppStore((s) => s.closeAISettings);
  const toggleTheme = useThemeStore((s) => s.toggle);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) {
        if (e.key === 'Escape') {
          closeSearch();
          closeExport();
          closeSummary();
          closeAISettings();
        }
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'f') {
        e.preventDefault();
        openSearch();
        return;
      }
      if (key === 'e') {
        e.preventDefault();
        openExport();
        return;
      }
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        temporal.getState().undo();
        return;
      }
      if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        temporal.getState().redo();
        return;
      }
      if (key === 'l' && e.shiftKey) {
        e.preventDefault();
        toggleTheme();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    temporal,
    openSearch,
    closeSearch,
    openExport,
    closeExport,
    closeSummary,
    closeAISettings,
    toggleTheme,
  ]);
}
