/**
 * AHA Node Manager
 *
 * Stateful but side-effect-free manager for a collection of thought nodes.
 * Useful for the Aha-mode input buffer and for building graphs incrementally.
 */

import { ThoughtNode, NodeStatus, Position } from './types';

export interface NodeManagerOptions {
  /** Initial node collection. */
  nodes?: ThoughtNode[];
}

/** Validates a ThoughtNode shape. */
export function validateNode(node: unknown): node is ThoughtNode {
  if (typeof node !== 'object' || node === null) return false;
  const n = node as Record<string, unknown>;
  return (
    typeof n.id === 'string' &&
    n.id.length > 0 &&
    typeof n.title === 'string' &&
    typeof n.content === 'string' &&
    typeof n.createdAt === 'string' &&
    typeof n.updatedAt === 'string' &&
    (n.status === 'active' || n.status === 'archived' || n.status === 'main-branch') &&
    Array.isArray(n.tags) &&
    typeof n.metadata === 'object' &&
    n.metadata !== null
  );
}

/** Convert a title into a URL-safe slug. */
export function generateSlug(title: string): string {
  const normalized = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return normalized.slice(0, 80) || 'node';
}

export class NodeManager {
  private _nodes: ThoughtNode[];
  private _lastTimestamp = 0;

  constructor(options: NodeManagerOptions = {}) {
    this._nodes = options.nodes ? [...options.nodes] : [];
  }

  private _now(): string {
    const ts = Date.now();
    const next = ts <= this._lastTimestamp ? this._lastTimestamp + 1 : ts;
    this._lastTimestamp = next;
    return new Date(next).toISOString();
  }

  /** All managed nodes. */
  get nodes(): ThoughtNode[] {
    return [...this._nodes];
  }

  /** Number of managed nodes. */
  get count(): number {
    return this._nodes.length;
  }

  /**
   * Create and register a new node.
   * @param title Short human-readable title.
   * @param content Optional Markdown body.
   * @param overrides Optional fields to merge (e.g. tags, metadata).
   */
  createNode(
    title: string,
    content = '',
    overrides: Partial<Omit<ThoughtNode, 'id' | 'createdAt' | 'updatedAt'>> = {},
  ): ThoughtNode {
    const now = this._now();
    const slugBase = generateSlug(title);
    const id = `${slugBase}-${now.replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 7)}`;
    const node: ThoughtNode = {
      id,
      title: title.trim() || '未命名节点',
      content,
      createdAt: now,
      updatedAt: now,
      status: overrides.status || 'active',
      tags: overrides.tags ? [...overrides.tags] : [],
      metadata: overrides.metadata ? { ...overrides.metadata } : {},
      ...(overrides.position !== undefined && { position: overrides.position }),
    };
    this._nodes = [...this._nodes, node];
    return node;
  }

  /** Retrieve a node by id. */
  getNode(id: string): ThoughtNode | undefined {
    return this._nodes.find((n) => n.id === id);
  }

  /** Update a node's content and bump its updatedAt timestamp. */
  updateContent(id: string, content: string): ThoughtNode | undefined {
    const now = this._now();
    let updated: ThoughtNode | undefined;
    this._nodes = this._nodes.map((n) => {
      if (n.id !== id) return n;
      updated = { ...n, content, updatedAt: now };
      return updated;
    });
    return updated;
  }

  /** Update node position on canvas. */
  setPosition(id: string, position: Position): ThoughtNode | undefined {
    let updated: ThoughtNode | undefined;
    this._nodes = this._nodes.map((n) => {
      if (n.id !== id) return n;
      updated = { ...n, position };
      return updated;
    });
    return updated;
  }

  /** Update node status. */
  setStatus(id: string, status: NodeStatus): ThoughtNode | undefined {
    let updated: ThoughtNode | undefined;
    this._nodes = this._nodes.map((n) => {
      if (n.id !== id) return n;
      updated = { ...n, status };
      return updated;
    });
    return updated;
  }

  /** Remove a node by id. */
  removeNode(id: string): boolean {
    const before = this._nodes.length;
    this._nodes = this._nodes.filter((n) => n.id !== id);
    return this._nodes.length < before;
  }

  /** Find nodes whose title or content contains the query (case-insensitive). */
  search(query: string): ThoughtNode[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return this._nodes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q),
    );
  }

  /** Return the N most recently created nodes. */
  recent(limit = 5): ThoughtNode[] {
    return [...this._nodes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
  }

  /** Replace the entire node collection (useful for loading a project). */
  load(nodes: ThoughtNode[]): void {
    this._nodes = nodes.filter((n) => validateNode(n));
  }

  /** Clear all nodes. */
  clear(): void {
    this._nodes = [];
  }
}
