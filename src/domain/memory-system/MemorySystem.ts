/**
 * AHA Memory System — Domain Core
 *
 * Manages L1 core memory, L2 working context assembly, and Aha-mode buffer.
 * Pure logic; no external dependencies.
 */

import type { GraphData, ThoughtNode } from '../graph-engine/types';
import type { CoreMemory, L2Context } from './types';

export interface MemorySystemOptions {
  /** In-memory L1 core memory store. */
  coreMemory?: CoreMemory;
}

export class MemorySystem {
  private coreMemory: CoreMemory;
  private buffer: ThoughtNode[] = [];
  private recentlyActivated: ThoughtNode[] = [];

  constructor(options: MemorySystemOptions = {}) {
    this.coreMemory = options.coreMemory ?? {
      projectGoal: '',
      constraints: [],
      keyDecisions: [],
      projectType: 'other',
    };
  }

  // L1 Core Memory
  getCoreMemory(): CoreMemory {
    return { ...this.coreMemory };
  }

  updateCoreMemory(update: Partial<CoreMemory>): void {
    this.coreMemory = { ...this.coreMemory, ...update };
  }

  recordDecision(decision: string, reason: string, alternatives: string[] = []): void {
    this.coreMemory.keyDecisions = [
      ...this.coreMemory.keyDecisions,
      {
        timestamp: new Date().toISOString(),
        decision,
        reason,
        alternatives,
      },
    ];
  }

  // L2 Working Context
  buildL2Context(graphData: GraphData, focusNodeId: string): L2Context {
    const focusNode = graphData.nodes.find((n) => n.id === focusNodeId);
    if (!focusNode) {
      throw new Error(`Focus node not found: ${focusNodeId}`);
    }

    const parentNodes = this.collectParents(graphData, focusNodeId, 3);
    const childNodes = this.collectChildren(graphData, focusNodeId, 1);

    const relatedClusters = graphData.clusters
      .filter((c) => c.nodeIds.includes(focusNodeId))
      .map((c) => ({ id: c.id, label: c.label, nodeIds: c.nodeIds }));

    // Update recently activated
    this.touchNode(focusNode);

    return {
      focusNode,
      parentNodes,
      childNodes,
      recentlyActivated: [...this.recentlyActivated],
      relatedClusters,
    };
  }

  private collectParents(graphData: GraphData, nodeId: string, depth: number): ThoughtNode[] {
    const result: ThoughtNode[] = [];
    const visited = new Set<string>();
    let current = [nodeId];

    for (let d = 0; d < depth && current.length; d++) {
      const next: string[] = [];
      for (const id of current) {
        for (const edge of graphData.edges) {
          if (edge.targetId === id && edge.type !== 'ai-suggested' && !visited.has(edge.sourceId)) {
            visited.add(edge.sourceId);
            const node = graphData.nodes.find((n) => n.id === edge.sourceId);
            if (node) {
              result.push(node);
              next.push(edge.sourceId);
            }
          }
        }
      }
      current = next;
    }

    return result;
  }

  private collectChildren(graphData: GraphData, nodeId: string, depth: number): ThoughtNode[] {
    const result: ThoughtNode[] = [];
    const visited = new Set<string>();
    let current = [nodeId];

    for (let d = 0; d < depth && current.length; d++) {
      const next: string[] = [];
      for (const id of current) {
        for (const edge of graphData.edges) {
          if (edge.sourceId === id && edge.type !== 'ai-suggested' && !visited.has(edge.targetId)) {
            visited.add(edge.targetId);
            const node = graphData.nodes.find((n) => n.id === edge.targetId);
            if (node) {
              result.push(node);
              next.push(edge.targetId);
            }
          }
        }
      }
      current = next;
    }

    return result;
  }

  private touchNode(node: ThoughtNode): void {
    this.recentlyActivated = [
      node,
      ...this.recentlyActivated.filter((n) => n.id !== node.id),
    ].slice(0, 10);
  }

  // Aha-mode buffer
  addToBuffer(node: ThoughtNode): void {
    this.buffer = [node, ...this.buffer.filter((n) => n.id !== node.id)].slice(0, 100);
  }

  flushBuffer(): ThoughtNode[] {
    const out = [...this.buffer];
    this.buffer = [];
    return out;
  }

  getBuffer(): ThoughtNode[] {
    return [...this.buffer];
  }
}
