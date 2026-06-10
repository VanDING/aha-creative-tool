import { describe, it, expect } from 'vitest';
import { MemorySystem } from './MemorySystem';
import { buildGraphData, addEdge } from '../graph-engine/GraphEngine';
import { createNode } from '../graph-engine/GraphEngine';

describe('MemorySystem', () => {
  it('stores and retrieves core memory', () => {
    const ms = new MemorySystem();
    ms.updateCoreMemory({ projectGoal: 'Write a novel', projectType: 'novel' });
    const cm = ms.getCoreMemory();
    expect(cm.projectGoal).toBe('Write a novel');
    expect(cm.projectType).toBe('novel');
  });

  it('records decisions', () => {
    const ms = new MemorySystem();
    ms.recordDecision('Use theme A', 'Fits the tone', ['theme B']);
    expect(ms.getCoreMemory().keyDecisions).toHaveLength(1);
  });

  it('builds L2 context with parents and children', () => {
    const ms = new MemorySystem();
    const a = createNode('A');
    const b = createNode('B');
    const c = createNode('C');
    let graph = buildGraphData([a, b, c]);
    graph = addEdge(graph, a.id, b.id, 'user-confirmed');
    graph = addEdge(graph, b.id, c.id, 'user-confirmed');

    const ctx = ms.buildL2Context(graph, b.id);
    expect(ctx.focusNode.id).toBe(b.id);
    expect(ctx.parentNodes).toHaveLength(1);
    expect(ctx.parentNodes[0].id).toBe(a.id);
    expect(ctx.childNodes).toHaveLength(1);
    expect(ctx.childNodes[0].id).toBe(c.id);
  });

  it('manages buffer', () => {
    const ms = new MemorySystem();
    const node = createNode('Idea');
    ms.addToBuffer(node);
    expect(ms.getBuffer()).toHaveLength(1);
    expect(ms.flushBuffer()).toHaveLength(1);
    expect(ms.getBuffer()).toHaveLength(0);
  });
});
