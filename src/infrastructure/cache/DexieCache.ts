/**
 * AHA Local Cache — Dexie.js (IndexedDB)
 *
 * Caches project metadata, node index, and AI association scan results
 * to speed up startup and avoid redundant AI calls.
 */

import Dexie, { type Table } from 'dexie';

export interface ProjectMetaCache {
  path: string;
  name: string;
  type: string;
  updatedAt: string;
}

export interface NodeIndexCache {
  projectId: string;
  nodes: Array<{
    id: string;
    title: string;
    status: 'active' | 'archived' | 'main-branch';
    updatedAt: string;
  }>;
  updatedAt: string;
}

export interface AssociationCacheEntry {
  projectId: string;
  nodePairKey: string; // "a|b" sorted
  reason: string;
  strength: number;
  updatedAt: string;
}

class AHACache extends Dexie {
  projectMeta!: Table<ProjectMetaCache, string>;
  nodeIndex!: Table<NodeIndexCache, string>;
  associations!: Table<AssociationCacheEntry, [string, string]>;

  constructor() {
    super('aha-cache');
    this.version(1).stores({
      projectMeta: 'path',
      nodeIndex: 'projectId',
      associations: '[projectId+nodePairKey]',
    });
  }
}

const db = new AHACache();

export class DexieCache {
  async getProjectMeta(path: string): Promise<ProjectMetaCache | null> {
    return (await db.projectMeta.get(path)) ?? null;
  }

  async setProjectMeta(meta: ProjectMetaCache): Promise<void> {
    await db.projectMeta.put(meta);
  }

  async getNodeIndex(projectId: string): Promise<NodeIndexCache | null> {
    return (await db.nodeIndex.get(projectId)) ?? null;
  }

  async setNodeIndex(index: NodeIndexCache): Promise<void> {
    await db.nodeIndex.put(index);
  }

  async getAssociation(
    projectId: string,
    nodeAId: string,
    nodeBId: string,
  ): Promise<AssociationCacheEntry | null> {
    const pairKey = [nodeAId, nodeBId].sort().join('|');
    return (await db.associations.where({ projectId, nodePairKey: pairKey }).first()) ?? null;
  }

  async setAssociation(
    projectId: string,
    nodeAId: string,
    nodeBId: string,
    reason: string,
    strength: number,
  ): Promise<void> {
    const pairKey = [nodeAId, nodeBId].sort().join('|');
    await db.associations.put({
      projectId,
      nodePairKey: pairKey,
      reason,
      strength,
      updatedAt: new Date().toISOString(),
    });
  }

  async clearProject(projectId: string): Promise<void> {
    await db.nodeIndex.delete(projectId);
    await db.associations.where({ projectId }).delete();
  }
}

export const dexieCache = new DexieCache();
