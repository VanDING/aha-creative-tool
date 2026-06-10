/**
 * AHA File System Service — Tauri backend bridge
 *
 * All heavy file operations delegate to Rust commands via Tauri invoke().
 * This layer is allowed to depend on Tauri APIs; the domain layer is not.
 */

import { invoke } from '@tauri-apps/api/core';
import type { ThoughtNode, Edge, Cluster, MainBranch } from '@domain/graph-engine/types';

export interface GraphIndex {
  /** Schema version for forward compatibility. */
  version: number;
  /** Node entries (lightweight refs; full content lives in nodes/*.md). */
  nodes: Array<{
    id: string;
    filename: string;
    title: string;
    status: 'active' | 'archived' | 'main-branch';
    createdAt: string;
    updatedAt: string;
    tags: string[];
  }>;
  /** Confirmed/main-path edges. */
  edges: Edge[];
  /** AI-identified clusters. */
  clusters: Cluster[];
  /** User-marked main branches. */
  mainBranches: MainBranch[];
}

export interface FileSystemService {
  writeNode(nodePath: string, content: string): Promise<void>;
  readNode(nodePath: string): Promise<string>;
  deleteNode(nodePath: string): Promise<void>;
  readGraphIndex(projectPath: string): Promise<GraphIndex>;
  writeGraphIndex(projectPath: string, index: GraphIndex): Promise<void>;
  createProjectDirs(projectPath: string): Promise<void>;
}

/** Serialize a ThoughtNode into Markdown frontmatter + body. */
export function nodeToMarkdown(node: ThoughtNode): string {
  const tags = node.tags.length ? `\ntags:\n${node.tags.map((t) => `  - ${t}`).join('\n')}` : '';
  return [
    '---',
    `id: ${node.id}`,
    `title: ${node.title}`,
    `createdAt: ${node.createdAt}`,
    `updatedAt: ${node.updatedAt}`,
    `status: ${node.status}`,
    tags,
    '---',
    '',
    node.content,
  ]
    .filter(Boolean)
    .join('\n');
}

/** Minimal Markdown frontmatter parser for node files produced by AHA. */
export function markdownToNode(content: string, filename: string): ThoughtNode {
  const lines = content.split('\n');
  let inFrontMatter = false;
  let frontMatterClosed = false;
  const front: Record<string, string> = {};
  const bodyLines: string[] = [];
  let currentKey = '';
  const listValues: string[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line === '---') {
      if (!inFrontMatter) {
        inFrontMatter = true;
        continue;
      }
      if (!frontMatterClosed) {
        frontMatterClosed = true;
        if (currentKey && listValues.length) {
          front[currentKey] = listValues.join(',');
        }
        continue;
      }
    }

    if (!frontMatterClosed) {
      if (line.startsWith('- ')) {
        listValues.push(line.slice(2).trim());
        continue;
      }
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        if (currentKey && listValues.length) {
          front[currentKey] = listValues.join(',');
          listValues.length = 0;
        }
        currentKey = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        if (value) {
          front[currentKey] = value;
          currentKey = '';
        }
      }
      continue;
    }

    bodyLines.push(raw);
  }

  const tagsRaw = front.tags || '';
  const tags = tagsRaw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    id: front.id || filename.replace(/\.md$/, ''),
    title: front.title || '未命名节点',
    content: bodyLines.join('\n').trim(),
    createdAt: front.createdAt || new Date().toISOString(),
    updatedAt: front.updatedAt || new Date().toISOString(),
    status: (front.status as ThoughtNode['status']) || 'active',
    tags,
    metadata: {},
  };
}

function nodeFilename(nodeId: string): string {
  return `${nodeId}.md`;
}

export class TauriFileSystemService implements FileSystemService {
  async writeNode(nodePath: string, content: string): Promise<void> {
    const projectPath = this._projectPathFromNodePath(nodePath);
    const filename = this._filenameFromNodePath(nodePath);
    await invoke('write_node', { projectPath, filename, content });
  }

  async readNode(nodePath: string): Promise<string> {
    const projectPath = this._projectPathFromNodePath(nodePath);
    const filename = this._filenameFromNodePath(nodePath);
    return invoke<string>('read_node', { projectPath, filename });
  }

  async deleteNode(nodePath: string): Promise<void> {
    const projectPath = this._projectPathFromNodePath(nodePath);
    const filename = this._filenameFromNodePath(nodePath);
    await invoke('delete_node', { projectPath, filename });
  }

  async readGraphIndex(projectPath: string): Promise<GraphIndex> {
    const raw = await invoke<string>('read_graph_index', { projectPath });
    try {
      const parsed = JSON.parse(raw) as Partial<GraphIndex>;
      return {
        version: parsed.version ?? 1,
        nodes: parsed.nodes ?? [],
        edges: parsed.edges ?? [],
        clusters: parsed.clusters ?? [],
        mainBranches: parsed.mainBranches ?? [],
      };
    } catch {
      return {
        version: 1,
        nodes: [],
        edges: [],
        clusters: [],
        mainBranches: [],
      };
    }
  }

  async writeGraphIndex(projectPath: string, index: GraphIndex): Promise<void> {
    const content = JSON.stringify(index, null, 2);
    await invoke('write_graph_index', { projectPath, content });
  }

  async createProjectDirs(projectPath: string): Promise<void> {
    await invoke('create_project_dirs', { projectPath });
  }

  /** Build a node filesystem path: projectPath/nodes/nodeId.md */
  nodePath(projectPath: string, nodeId: string): string {
    return `${projectPath}/nodes/${nodeFilename(nodeId)}`;
  }

  private _projectPathFromNodePath(nodePath: string): string {
    // nodePath is expected to be "projectPath/nodes/filename.md"
    const parts = nodePath.split('/');
    if (parts.length >= 3 && parts[parts.length - 2] === 'nodes') {
      return parts.slice(0, parts.length - 2).join('/');
    }
    return nodePath;
  }

  private _filenameFromNodePath(nodePath: string): string {
    return nodePath.split('/').pop() || nodePath;
  }
}

/** Shared singleton instance. */
export const fileSystemService = new TauriFileSystemService();
