import { describe, it, expect } from 'vitest';
import { AIEngine } from './AIEngine';
import type { AIGatewayLike } from './AIEngine';
import type { StreamChunk } from '@infrastructure/ai/types';

function makeMockGateway(streamChunks: StreamChunk[]): AIGatewayLike {
  return {
    async *streamGenerate() {
      for (const chunk of streamChunks) {
        yield chunk;
      }
    },
    async generateStructured<T>(_taskType: unknown, _options: unknown) {
      void _taskType;
      void _options;
      return {} as T;
    },
  };
}

const coreMemory = {
  projectGoal: 'Write a novel',
  constraints: [],
  keyDecisions: [],
  projectType: 'novel',
};

const l2Context = {
  focusNode: {
    id: 'n1',
    title: 'Theme',
    content: 'Love and loss',
    createdAt: '',
    updatedAt: '',
    status: 'active' as const,
    tags: [],
    metadata: {},
  },
  parentNodes: [],
  childNodes: [],
  recentlyActivated: [],
  relatedClusters: [],
};

describe('AIEngine', () => {
  it('streams extension directions', async () => {
    const gateway = makeMockGateway([
      { type: 'text', content: '### Direction 1\nSome content here' },
      { type: 'done' },
    ]);
    const engine = new AIEngine({ gateway });
    const chunks: Array<{ type: string; directionId?: string; title?: string; content?: string }> =
      [];

    for await (const chunk of engine.generateExtensions(coreMemory, l2Context)) {
      chunks.push(chunk);
    }

    expect(chunks.some((c) => c.type === 'direction')).toBe(true);
  });

  it('streams devils advocate output', async () => {
    const gateway = makeMockGateway([
      { type: 'text', content: 'This idea has a flaw.' },
      { type: 'done' },
    ]);
    const engine = new AIEngine({ gateway });
    const parts: string[] = [];

    for await (const text of engine.generateDevilsAdvocate(coreMemory, l2Context)) {
      parts.push(text);
    }

    expect(parts.join('')).toBe('This idea has a flaw.');
  });
});
