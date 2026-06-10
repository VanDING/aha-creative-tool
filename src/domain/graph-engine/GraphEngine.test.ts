import { describe, it, expect } from 'vitest';
import {
  createNode,
  updateNodeContent,
  removeNode,
  addEdge,
  removeEdge,
  markAsMainBranch,
  archiveBranch,
  buildGraphData,
  toG6Format,
  detectMainPath,
  findShortestPath,
} from './GraphEngine';
import { GraphData, ThoughtNode } from './types';

function makeNode(title: string, content = ''): ThoughtNode {
  return createNode(title, content);
}

function makeGraph(...nodes: ThoughtNode[]): GraphData {
  return buildGraphData(nodes);
}

describe('createNode', () => {
  it('creates a node with defaults', () => {
    const node = createNode('Hello World');
    expect(node.title).toBe('Hello World');
    expect(node.content).toBe('');
    expect(node.status).toBe('active');
    expect(node.tags).toEqual([]);
    expect(node.id).toContain('hello-world');
    expect(new Date(node.createdAt).getTime()).toBeGreaterThan(0);
    expect(node.updatedAt).toBe(node.createdAt);
  });

  it('uses provided content', () => {
    const node = createNode('Idea', 'Some markdown');
    expect(node.content).toBe('Some markdown');
  });

  it('falls back to a default title for empty input', () => {
    const node = createNode('  ');
    expect(node.title).toBe('未命名节点');
  });
});

describe('updateNodeContent', () => {
  it('updates content and bumped updatedAt', () => {
    const a = makeNode('A');
    const graph = makeGraph(a);
    const updated = updateNodeContent(graph, a.id, 'New content');
    expect(updated.nodes[0].content).toBe('New content');
    expect(new Date(updated.nodes[0].updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(a.updatedAt).getTime(),
    );
  });

  it('does not mutate the original graph', () => {
    const a = makeNode('A');
    const graph = makeGraph(a);
    updateNodeContent(graph, a.id, 'Changed');
    expect(graph.nodes[0].content).toBe('');
  });
});

describe('removeNode', () => {
  it('removes the node and connected edges', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    let graph = makeGraph(a, b);
    graph = addEdge(graph, a.id, b.id, 'user-confirmed');
    graph = removeNode(graph, a.id);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].id).toBe(b.id);
    expect(graph.edges).toHaveLength(0);
  });

  it('cleans up ai suggestions touching the removed node', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    let graph = makeGraph(a, b);
    graph = addEdge(graph, a.id, b.id, 'ai-suggested', 'similar', 0.8);
    graph = removeNode(graph, b.id);
    expect(graph.aiSuggestions).toHaveLength(0);
  });
});

describe('addEdge', () => {
  it('adds a user-confirmed edge', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    const graph = addEdge(makeGraph(a, b), a.id, b.id, 'user-confirmed');
    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].sourceId).toBe(a.id);
    expect(graph.edges[0].targetId).toBe(b.id);
  });

  it('throws for missing source or target', () => {
    const a = makeNode('A');
    expect(() => addEdge(makeGraph(a), 'missing', a.id, 'user-confirmed')).toThrow(
      'Source node not found',
    );
    expect(() => addEdge(makeGraph(a), a.id, 'missing', 'user-confirmed')).toThrow(
      'Target node not found',
    );
  });

  it('stores ai-suggested edges separately', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    const graph = addEdge(makeGraph(a, b), a.id, b.id, 'ai-suggested', 'similar', 0.7);
    expect(graph.edges).toHaveLength(0);
    expect(graph.aiSuggestions).toHaveLength(1);
    expect(graph.aiSuggestions[0].confidence).toBe(0.7);
  });
});

describe('removeEdge', () => {
  it('removes a confirmed edge', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    let graph = makeGraph(a, b);
    graph = addEdge(graph, a.id, b.id, 'user-confirmed');
    const edgeId = graph.edges[0].id;
    graph = removeEdge(graph, edgeId);
    expect(graph.edges).toHaveLength(0);
  });

  it('removes an ai suggestion edge', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    let graph = makeGraph(a, b);
    graph = addEdge(graph, a.id, b.id, 'ai-suggested', 'similar', 0.5);
    const edgeId = graph.aiSuggestions[0].id;
    graph = removeEdge(graph, edgeId);
    expect(graph.aiSuggestions).toHaveLength(0);
  });
});

describe('markAsMainBranch', () => {
  it('creates a main branch from a single node', () => {
    const a = makeNode('A');
    const graph = markAsMainBranch(makeGraph(a), a.id, '方案A');
    expect(graph.mainBranches).toHaveLength(1);
    expect(graph.mainBranches[0].name).toBe('方案A');
    expect(graph.mainBranches[0].nodeIds).toContain(a.id);
    expect(graph.nodes[0].status).toBe('main-branch');
  });

  it('follows user-confirmed edges to collect descendants', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    const c = makeNode('C');
    let graph = makeGraph(a, b, c);
    graph = addEdge(graph, a.id, b.id, 'user-confirmed');
    graph = addEdge(graph, b.id, c.id, 'user-confirmed');
    graph = markAsMainBranch(graph, a.id, '主线');
    expect(graph.mainBranches[0].nodeIds).toHaveLength(3);
    expect(graph.nodes.map((n) => n.status)).toEqual(['main-branch', 'main-branch', 'main-branch']);
  });

  it('throws when node is missing', () => {
    expect(() => markAsMainBranch(makeGraph(), 'x', '方案')).toThrow('Node not found');
  });
});

describe('archiveBranch', () => {
  it('archives a node with a reason', () => {
    const a = makeNode('A');
    let graph = makeGraph(a);
    graph = archiveBranch(graph, a.id, '不再相关');
    expect(graph.nodes[0].status).toBe('archived');
    expect(graph.archivedBranches).toHaveLength(1);
    expect(graph.archivedBranches![0].reason).toBe('不再相关');
  });

  it('archives the whole subtree', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    const c = makeNode('C');
    let graph = makeGraph(a, b, c);
    graph = addEdge(graph, a.id, b.id, 'user-confirmed');
    graph = addEdge(graph, b.id, c.id, 'user-confirmed');
    graph = archiveBranch(graph, a.id, '砍掉');
    expect(graph.nodes.every((n) => n.status === 'archived')).toBe(true);
  });
});

describe('buildGraphData', () => {
  it('assembles a graph with defaults', () => {
    const a = makeNode('A');
    const graph = buildGraphData([a]);
    expect(graph.nodes).toHaveLength(1);
    expect(graph.edges).toEqual([]);
    expect(graph.clusters).toEqual([]);
    expect(graph.aiSuggestions).toEqual([]);
    expect(graph.mainBranches).toEqual([]);
  });
});

describe('toG6Format', () => {
  it('converts nodes and edges', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    let graph = makeGraph(a, b);
    graph = addEdge(graph, a.id, b.id, 'user-confirmed');
    const g6 = toG6Format(graph);
    expect(g6.nodes).toHaveLength(2);
    expect(g6.edges).toHaveLength(1);
    expect(g6.edges[0].source).toBe(a.id);
    expect(g6.edges[0].target).toBe(b.id);
  });

  it('renders ai suggestions as dashed edges', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    let graph = makeGraph(a, b);
    graph = addEdge(graph, a.id, b.id, 'ai-suggested', 'similar', 0.9);
    const g6 = toG6Format(graph);
    expect(g6.edges).toHaveLength(1);
    expect(g6.edges[0].style).toMatchObject({ lineDash: [5, 5] });
  });

  it('renders clusters as combos', () => {
    const a = makeNode('A');
    const graph = buildGraphData(
      [a],
      [],
      [{ id: 'c1', label: '主题1', nodeIds: [a.id], color: '#ff0000' }],
    );
    const g6 = toG6Format(graph);
    expect(g6.combos).toHaveLength(1);
    expect(g6.combos![0].id).toBe('c1');
  });
});

describe('detectMainPath', () => {
  it('returns the longest path from the start node', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    const c = makeNode('C');
    const d = makeNode('D');
    let graph = makeGraph(a, b, c, d);
    graph = addEdge(graph, a.id, b.id, 'user-confirmed');
    graph = addEdge(graph, b.id, c.id, 'user-confirmed');
    graph = addEdge(graph, a.id, d.id, 'user-confirmed');
    const path = detectMainPath(a.id, graph);
    expect(path).toEqual([a.id, b.id, c.id]);
  });

  it('ignores ai-suggested edges', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    let graph = makeGraph(a, b);
    graph = addEdge(graph, a.id, b.id, 'ai-suggested', 'suspect', 0.5);
    expect(detectMainPath(a.id, graph)).toEqual([a.id]);
  });
});

describe('findShortestPath', () => {
  it('finds the shortest directed path', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    const c = makeNode('C');
    let graph = makeGraph(a, b, c);
    graph = addEdge(graph, a.id, b.id, 'user-confirmed');
    graph = addEdge(graph, b.id, c.id, 'user-confirmed');
    graph = addEdge(graph, a.id, c.id, 'user-confirmed');
    expect(findShortestPath(a.id, c.id, graph)).toEqual([a.id, c.id]);
  });

  it('returns empty array when unreachable', () => {
    const a = makeNode('A');
    const b = makeNode('B');
    const graph = makeGraph(a, b);
    expect(findShortestPath(a.id, b.id, graph)).toEqual([]);
  });

  it('returns self when from === to', () => {
    const a = makeNode('A');
    expect(findShortestPath(a.id, a.id, makeGraph(a))).toEqual([a.id]);
  });
});
