import { describe, it, expect } from 'vitest';
import { DeviationDetector } from './DeviationDetector';
import type { AIGatewayLike } from '../ai-engine/AIEngine';

function makeMockGateway(result: {
  type: 'relevant' | 'uncertain' | 'deviated';
  confidence: number;
  message?: string;
}): AIGatewayLike {
  return {
    async *streamGenerate() {
      yield { type: 'done' };
    },
    async generateStructured<T>(_taskType: unknown, _options: unknown) {
      void _taskType;
      void _options;
      return result as T;
    },
  };
}

const coreMemory = {
  projectGoal: 'Write a novel',
  constraints: [],
  keyDecisions: [],
  projectType: 'novel',
};

describe('DeviationDetector', () => {
  it('classifies relevant input', async () => {
    const detector = new DeviationDetector({
      gateway: makeMockGateway({ type: 'relevant', confidence: 0.9 }),
    });
    const result = await detector.check('A new character idea', coreMemory);
    expect(result.type).toBe('relevant');
    expect(result.confidence).toBe(0.9);
  });

  it('classifies deviated input', async () => {
    const detector = new DeviationDetector({
      gateway: makeMockGateway({ type: 'deviated', confidence: 0.8, message: 'Off topic' }),
    });
    const result = await detector.check('Buy milk', coreMemory);
    expect(result.type).toBe('deviated');
  });
});
