import { describe, it, expect } from 'vitest';
import { AdapterFactory } from './AdapterFactory';
import { OpenAICompatAdapter } from './adapters/OpenAICompatAdapter';
import { AnthropicAdapter } from './adapters/AnthropicAdapter';

describe('AdapterFactory', () => {
  const factory = new AdapterFactory();

  it('creates AnthropicAdapter for anthropic protocol', () => {
    const adapter = factory.createAdapter(
      {
        id: 'a',
        name: 'Anthropic',
        protocol: 'anthropic',
        baseURL: 'https://api.anthropic.com',
        models: [],
        enabled: true,
      },
      'key',
    );
    expect(adapter).toBeInstanceOf(AnthropicAdapter);
  });

  it('creates OpenAICompatAdapter for openai-compatible protocol', () => {
    const adapter = factory.createAdapter(
      {
        id: 'o',
        name: 'OpenAI',
        protocol: 'openai-compatible',
        baseURL: 'https://api.openai.com',
        models: [],
        enabled: true,
        authType: 'bearer',
      },
      'key',
    );
    expect(adapter).toBeInstanceOf(OpenAICompatAdapter);
  });
});
