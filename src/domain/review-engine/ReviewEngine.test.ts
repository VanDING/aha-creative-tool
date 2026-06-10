import { describe, it, expect } from 'vitest';
import { ReviewEngine } from './ReviewEngine';
import type { AIGatewayLike } from '../ai-engine/AIEngine';

function makeGateway(texts: string[]): AIGatewayLike {
  return {
    async *streamGenerate() {
      for (const t of texts) {
        yield { type: 'text', content: t };
      }
      yield { type: 'done' };
    },
    async generateStructured<T>() {
      return {} as T;
    },
  };
}

const coreMemory = {
  projectGoal: 'Build an app',
  constraints: [],
  keyDecisions: [],
  projectType: 'software' as const,
};

const l2Context = {
  focusNode: {
    id: 'n1',
    title: 'Feature',
    content: 'AI assistant',
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

describe('ReviewEngine', () => {
  it('yields critique chunks for logical-flaw', async () => {
    const engine = new ReviewEngine({ gateway: makeGateway(['Flaw 1', 'Flaw 2']) });
    const chunks = [];
    for await (const chunk of engine.generateCritique(
      'n1',
      coreMemory,
      l2Context,
      'logical-flaw',
    )) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBe(2);
    expect(chunks[0].type).toBe('logical-flaw');
    expect(chunks[0].severity).toBe('suggestion');
  });

  it('yields fallback when stream is empty', async () => {
    const engine = new ReviewEngine({ gateway: makeGateway([]) });
    const chunks = [];
    for await (const chunk of engine.generateCritique(
      'n1',
      coreMemory,
      l2Context,
      'risk-analysis',
    )) {
      chunks.push(chunk);
    }
    expect(chunks.length).toBe(1);
    expect(chunks[0].content).toContain('未生成有效内容');
  });
});
