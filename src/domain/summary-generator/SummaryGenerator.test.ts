import { describe, it, expect } from 'vitest';
import { SummaryGenerator } from './SummaryGenerator';
import { buildGraphData, createNode, markAsMainBranch } from '../graph-engine/GraphEngine';

describe('SummaryGenerator', () => {
  it('generates summary for empty graph', () => {
    const gen = new SummaryGenerator();
    const data = buildGraphData([]);
    const summary = gen.generate({ projectName: 'Test', graphData: data });
    expect(summary.nodeCount).toBe(0);
    expect(summary.branchCount).toBe(0);
    expect(summary.deliverables[0]).toContain('继续积累');
  });

  it('uses main branch name when available', () => {
    const gen = new SummaryGenerator();
    const a = createNode('A');
    let data = buildGraphData([a]);
    data = markAsMainBranch(data, a.id, '主线方案');
    const summary = gen.generate({ projectName: 'Novel', graphData: data });
    expect(summary.mainBranchName).toBe('主线方案');
    expect(summary.journey).toContain('主线方案');
    expect(summary.suggestedName).toBe('主线方案');
  });
});
