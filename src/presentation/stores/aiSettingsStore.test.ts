import { describe, it, expect } from 'vitest';
import { useAISettingsStore } from './aiSettingsStore';

describe('aiSettingsStore', () => {
  it('adds, updates and removes providers', () => {
    const store = useAISettingsStore.getState();
    store.addProvider({
      id: 'p1',
      name: 'OpenAI',
      protocol: 'openai-compatible',
      baseURL: 'https://api.openai.com',
      models: [],
      enabled: true,
      authType: 'bearer',
    });
    expect(useAISettingsStore.getState().providers).toHaveLength(1);

    store.updateProvider('p1', { name: 'Updated' });
    expect(useAISettingsStore.getState().providers[0].name).toBe('Updated');

    store.removeProvider('p1');
    expect(useAISettingsStore.getState().providers).toHaveLength(0);
  });

  it('sets routing and loading state', () => {
    const store = useAISettingsStore.getState();
    store.setLoading(true);
    expect(useAISettingsStore.getState().isLoading).toBe(true);

    store.setError('fail');
    expect(useAISettingsStore.getState().error).toBe('fail');

    store.setRouting({
      defaultModel: { providerId: 'p1', modelId: 'gpt-4' },
      taskModels: {},
    });
    expect(useAISettingsStore.getState().routing).toEqual({
      defaultModel: { providerId: 'p1', modelId: 'gpt-4' },
      taskModels: {},
    });
  });
});
