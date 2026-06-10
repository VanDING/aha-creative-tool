/**
 * AHA AI Settings State
 */

import { create } from 'zustand';
import type { ProviderConfig, ModelRoutingTable } from '@infrastructure/ai/types';

export interface AISettingsState {
  providers: ProviderConfig[];
  routing: ModelRoutingTable | null;
  isLoading: boolean;
  error: string | null;
}

export interface AISettingsActions {
  setProviders: (providers: ProviderConfig[]) => void;
  addProvider: (provider: ProviderConfig) => void;
  updateProvider: (id: string, update: Partial<ProviderConfig>) => void;
  removeProvider: (id: string) => void;
  setRouting: (routing: ModelRoutingTable) => void;
  setLoading: (value: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAISettingsStore = create<AISettingsState & AISettingsActions>((set) => ({
  providers: [],
  routing: null,
  isLoading: false,
  error: null,

  setProviders: (providers) => set({ providers }),
  addProvider: (provider) => set((state) => ({ providers: [...state.providers, provider] })),
  updateProvider: (id, update) =>
    set((state) => ({
      providers: state.providers.map((p) => (p.id === id ? { ...p, ...update } : p)),
    })),
  removeProvider: (id) =>
    set((state) => ({
      providers: state.providers.filter((p) => p.id !== id),
    })),
  setRouting: (routing) => set({ routing }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
}));
