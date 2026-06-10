import { describe, it, expect, beforeEach } from 'vitest';
import { useThemeStore } from './themeStore';

describe('themeStore', () => {
  beforeEach(() => {
    useThemeStore.setState({ theme: 'system', resolved: 'light' });
  });

  it('defaults to system/light', () => {
    const state = useThemeStore.getState();
    expect(state.theme).toBe('system');
    expect(state.resolved).toBe('light');
  });

  it('toggles between light and dark', () => {
    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().resolved).toBe('dark');
    useThemeStore.getState().toggle();
    expect(useThemeStore.getState().resolved).toBe('light');
  });

  it('sets explicit theme', () => {
    useThemeStore.getState().setTheme('dark');
    expect(useThemeStore.getState().theme).toBe('dark');
    expect(useThemeStore.getState().resolved).toBe('dark');
  });
});
