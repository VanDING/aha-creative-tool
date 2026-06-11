/**
 * AHA Graph Engine — Pure Functional Core
 *
 * All functions are pure: zero side effects, zero external dependencies.
 * Input `GraphData` is never mutated; updated copies are returned.
 */

import {
  GraphData,
  ThoughtNode,
  Edge,
  EdgeType,
  AISuggestedEdge,
  MainBranch,
  ArchivedBranch,
  Cluster,
  G6GraphData,
  G6NodeData,
  G6EdgeData,
  G6ComboData,
  NodeStatus,
} from './types';

/** Generate a time-sortable id from a slug base. */
function generateId(slugBase: string): string {
  const ts = Date.now();
  return `${slugBase}-${ts}`;
}

/** Simple slugify: lowercase, replace whitespace with '-', strip non-word chars. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-\u4e00-\u9fa5]+/g, '')
    .slice(0, 64);
}

/**
 * Create a new ThoughtNode.
 * @param title Short title for the node.
 * @param content Optional Markdown content (defaults to empty string).
 */
export function createNode(title: string, content = ''): ThoughtNode {
  const now = new Date().toISOString();
  const id = generateId(slugify(title) || 'node');
  return {
    id,
    title: title.trim() || '未命名节点',
    content,
    createdAt: now,
    updatedAt: now,
    status: 'active',
    tags: [],
    metadata: {},
  };
}

/**
 * Update a node's Markdown content and bump its `updatedAt` timestamp.
 * Returns a new `GraphData`; the original is not mutated.
 */
export function updateNodeContent(
  graphData: GraphData,
  nodeId: string,
  content: string,
): GraphData {
  const now = new Date().toISOString();
  return {
    ...graphData,
    nodes: graphData.nodes.map((node) =>
      node.id === nodeId ? { ...node, content, updatedAt: now } : node,
    ),
  };
}

/**
 * Remove a node and all edges connected to it.
 */
export function removeNode(graphData: GraphData, nodeId: string): GraphData {
  return {
    ...graphData,
    nodes: graphData.nodes.filter((n) => n.id !== nodeId),
    edges: graphData.edges.filter((e) => e.sourceId !== nodeId && e.targetId !== nodeId),
    aiSuggestions: graphData.aiSuggestions.filter(
      (e) => e.sourceId !== nodeId && e.targetId !== nodeId,
    ),
    clusters: graphData.clusters
      .map((c) => ({ ...c, nodeIds: c.nodeIds.filter((id) => id !== nodeId) }))
      .filter((c) => c.nodeIds.length > 0),
    mainBranches: graphData.mainBranches
      .map((b) => ({ ...b, nodeIds: b.nodeIds.filter((id) => id !== nodeId) }))
      .filter((b) => b.nodeIds.length > 0),
  };
}

/**
 * Add a new edge between two existing nodes.
 * @returns A new GraphData with the edge appended.
 * @throws If source or target node does not exist.
 */
export function addEdge(
  graphData: GraphData,
  sourceId: string,
  targetId: string,
  type: EdgeType,
  label?: string,
  confidence?: number,
): GraphData {
  const sourceExists = graphData.nodes.some((n) => n.id === sourceId);
  const targetExists = graphData.nodes.some((n) => n.id === targetId);
  if (!sourceExists) {
    throw new Error(`Source node not found: ${sourceId}`);
  }
  if (!targetExists) {
    throw new Error(`Target node not found: ${targetId}`);
  }
  const id = `edge-${sourceId}-${targetId}-${Date.now()}`;
  const newEdge: Edge = { id, sourceId, targetId, type, label, confidence };

  if (type === 'ai-suggested' && confidence !== undefined) {
    const suggested: AISuggestedEdge = {
      ...newEdge,
      type: 'ai-suggested',
      confidence,
      reason: label || '',
    };
    return {
      ...graphData,
      aiSuggestions: [...graphData.aiSuggestions, suggested],
    };
  }

  return { ...graphData, edges: [...graphData.edges, newEdge] };
}

/**
 * Remove an edge by id from both confirmed edges and AI suggestions.
 */
export function removeEdge(graphData: GraphData, edgeId: string): GraphData {
  return {
    ...graphData,
    edges: graphData.edges.filter((e) => e.id !== edgeId),
    aiSuggestions: graphData.aiSuggestions.filter((e) => e.id !== edgeId),
  };
}

/**
 * Mark a node as part of a new or existing main branch.
 * Creates a `MainBranch` containing the node and any reachable active descendants.
 */
export function markAsMainBranch(graphData: GraphData, nodeId: string, name: string): GraphData {
  const node = graphData.nodes.find((n) => n.id === nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  const now = new Date().toISOString();
  const branchId = `branch-${slugify(name)}-${Date.now()}`;

  // Collect reachable descendants along user-confirmed edges for the branch path.
  const visited = new Set<string>();
  const stack: string[] = [nodeId];
  while (stack.length) {
    const current = stack.pop()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const edge of graphData.edges) {
      if (
        edge.sourceId === current &&
        (edge.type === 'user-confirmed' || edge.type === 'main-path')
      ) {
        stack.push(edge.targetId);
      }
    }
  }

  const mainBranch: MainBranch = {
    id: branchId,
    name,
    nodeIds: Array.from(visited),
    createdAt: now,
  };

  return {
    ...graphData,
    nodes: graphData.nodes.map((n) =>
      visited.has(n.id) && n.status !== 'archived'
        ? { ...n, status: 'main-branch' as NodeStatus }
        : n,
    ),
    mainBranches: [...graphData.mainBranches, mainBranch],
  };
}

/**
 * Archive (prune) a branch rooted at the given node.
 */
export function archiveBranch(graphData: GraphData, nodeId: string, reason: string): GraphData {
  const node = graphData.nodes.find((n) => n.id === nodeId);
  if (!node) {
    throw new Error(`Node not found: ${nodeId}`);
  }

  const now = new Date().toISOString();
  const archived: ArchivedBranch = {
    nodeId,
    reason,
    archivedAt: now,
  };

  // Collect the subtree to archive.
  const subtree = new Set<string>();
  const stack: string[] = [nodeId];
  while (stack.length) {
    const current = stack.pop()!;
    if (subtree.has(current)) continue;
    subtree.add(current);
    for (const edge of graphData.edges) {
      if (edge.sourceId === current && edge.type !== 'ai-suggested') {
        stack.push(edge.targetId);
      }
    }
  }

  return {
    ...graphData,
    nodes: graphData.nodes.map((n) =>
      subtree.has(n.id) ? { ...n, status: 'archived' as NodeStatus } : n,
    ),
    archivedBranches: [...(graphData.archivedBranches || []), archived],
  };
}

/**
 * Build a complete GraphData object from loose parts.
 */
export function buildGraphData(
  nodes: ThoughtNode[],
  edges: Edge[] = [],
  clusters: Cluster[] = [],
  aiSuggestions: AISuggestedEdge[] = [],
  mainBranches: MainBranch[] = [],
  archivedBranches: ArchivedBranch[] = [],
): GraphData {
  return {
    nodes: [...nodes],
    edges: [...edges],
    clusters: [...clusters],
    aiSuggestions: [...aiSuggestions],
    mainBranches: [...mainBranches],
    archivedBranches: [...archivedBranches],
  };
}

export interface ToG6FormatOptions {
  /** Render labels and strokes for a dark background. */
  dark?: boolean;
}

/**
 * Convert domain GraphData into G6 v5 compatible graph data.
 */
export function toG6Format(graphData: GraphData, options?: ToG6FormatOptions): G6GraphData {
  const dark = options?.dark ?? false;

  const statusColor: Record<NodeStatus, string> = {
    active: dark ? '#1f2937' : '#ffffff',
    archived: '#6b7280',
    'main-branch': '#22c55e',
  };

  const statusStroke: Record<NodeStatus, string> = {
    active: dark ? '#7ec8e3' : '#d4a574',
    archived: '#4b5563',
    'main-branch': '#16a34a',
  };

  const labelFill = dark ? '#e5e7eb' : '#1a1a1a';

  const nodes: G6NodeData[] = graphData.nodes.map((node) => {
    const base: G6NodeData = {
      id: node.id,
      data: { ...node },
    };

    if (node.status === 'archived') {
      base.style = {
        fill: statusColor[node.status],
        stroke: statusStroke[node.status],
        lineWidth: 1,
        r: 12,
        labelText: node.title,
        labelFill: dark ? '#9ca3af' : '#6b7280',
        opacity: 0.6,
      };
    } else {
      base.style = {
        fill: statusColor[node.status],
        stroke: statusStroke[node.status],
        lineWidth: 2,
        r: node.status === 'main-branch' ? 28 : 24,
        labelText: node.title,
        labelFill,
      };
    }

    return base;
  });

  const edges: G6EdgeData[] = graphData.edges.map((edge) => ({
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    data: { ...edge },
    style: {
      stroke:
        edge.type === 'main-path'
          ? '#22c55e'
          : edge.type === 'user-confirmed'
            ? '#d4a574'
            : '#9ca3af',
      lineWidth: edge.type === 'main-path' ? 3 : 2,
      lineDash: edge.type === 'ai-suggested' ? [5, 5] : undefined,
      endArrow: true,
    },
  }));

  const aiEdges: G6EdgeData[] = graphData.aiSuggestions.map((edge) => ({
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    data: { ...edge },
    style: {
      stroke: '#f59e0b',
      lineWidth: 1,
      lineDash: [5, 5],
      opacity: 0.4 + (edge.confidence || 0) * 0.6,
      endArrow: true,
    },
  }));

  const combos: G6ComboData[] = graphData.clusters.map((cluster) => ({
    id: cluster.id,
    data: { ...cluster },
    style: {
      stroke: cluster.color || '#8b5cf6',
      fill: cluster.color ? `${cluster.color}20` : '#8b5cf620',
      lineWidth: 1,
      labelText: cluster.label,
      labelFill: cluster.color || '#8b5cf6',
    },
  }));

  return { nodes, edges: [...edges, ...aiEdges], combos };
}

/**
 * Detect the longest directed path starting from `startNodeId`.
 * Returns an ordered list of node ids.
 */
export function detectMainPath(startNodeId: string, graphData: GraphData): string[] {
  const adjacency = new Map<string, string[]>();
  for (const edge of graphData.edges) {
    if (edge.type === 'ai-suggested') continue;
    const list = adjacency.get(edge.sourceId) || [];
    list.push(edge.targetId);
    adjacency.set(edge.sourceId, list);
  }

  const memo = new Map<string, string[]>();

  function dfs(nodeId: string): string[] {
    if (memo.has(nodeId)) return memo.get(nodeId)!;
    const children = adjacency.get(nodeId) || [];
    let longest: string[] = [nodeId];
    for (const child of children) {
      const path = dfs(child);
      if (path.length + 1 > longest.length) {
        longest = [nodeId, ...path];
      }
    }
    memo.set(nodeId, longest);
    return longest;
  }

  return dfs(startNodeId);
}

/**
 * Detect nodes that have zero edges (completely disconnected from the graph).
 * These are "orphan" ideas that may indicate deviation from the project focus.
 */
export function detectOrphanNodes(graphData: GraphData): string[] {
  const connected = new Set<string>();
  for (const edge of graphData.edges) {
    connected.add(edge.sourceId);
    connected.add(edge.targetId);
  }
  for (const edge of graphData.aiSuggestions) {
    connected.add(edge.sourceId);
    connected.add(edge.targetId);
  }
  return graphData.nodes
    .filter((n) => !connected.has(n.id) && n.status === 'active')
    .map((n) => n.id);
}

/**
 * Find the shortest directed path from `fromId` to `toId` using BFS.
 * Returns an ordered list of node ids, or an empty array if unreachable.
 */
export function findShortestPath(fromId: string, toId: string, graphData: GraphData): string[] {
  if (fromId === toId) return [fromId];

  const adjacency = new Map<string, string[]>();
  for (const edge of graphData.edges) {
    if (edge.type === 'ai-suggested') continue;
    const list = adjacency.get(edge.sourceId) || [];
    list.push(edge.targetId);
    adjacency.set(edge.sourceId, list);
  }

  const queue: Array<{ id: string; path: string[] }> = [{ id: fromId, path: [fromId] }];
  const visited = new Set<string>([fromId]);

  while (queue.length) {
    const { id, path } = queue.shift()!;
    for (const neighbor of adjacency.get(id) || []) {
      if (visited.has(neighbor)) continue;
      const nextPath = [...path, neighbor];
      if (neighbor === toId) return nextPath;
      visited.add(neighbor);
      queue.push({ id: neighbor, path: nextPath });
    }
  }

  return [];
}
