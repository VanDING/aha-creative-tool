/**
 * AHA Application Service
 *
 * Central workflow orchestrator. Coordinates domain logic with infrastructure
 * to implement the core user flows: Aha input, Zen view, branch confirmation,
 * pruning, and export.
 *
 * This layer does NOT depend on React / Zustand. Callers in the presentation
 * layer update the store after awaiting these methods.
 */

import { createNode, buildGraphData } from '@domain/graph-engine/GraphEngine';
import { generateSlug } from '@domain/graph-engine/NodeManager';
import type { GraphData, ThoughtNode } from '@domain/graph-engine/types';
import {
  fileSystemService,
  GraphIndex,
  nodeToMarkdown,
} from '@infrastructure/filesystem/TauriFileSystemService';
import { TauriGitService } from '@infrastructure/git/TauriGitService';

export interface CreateNodeResult {
  node: ThoughtNode;
  graphData?: GraphData;
}

export class ApplicationService {
  private fs = fileSystemService;

  /**
   * Build GraphData from disk for a given project path.
   */
  async buildGraphData(projectPath: string): Promise<GraphData> {
    const graphIndex = await this.fs.readGraphIndex(projectPath);
    const nodes: ThoughtNode[] = [];
    for (const entry of graphIndex.nodes) {
      const nodePath = this.fs.nodePath(projectPath, entry.id);
      try {
        const raw = await this.fs.readNode(nodePath);
        const content = raw.replace(/---[\s\S]*?---\n*/, '').trim();
        nodes.push({
          id: entry.id,
          title: entry.title,
          content,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
          status: entry.status,
          tags: entry.tags,
          metadata: {},
        });
      } catch {
        // Skip unreadable nodes
      }
    }

    return buildGraphData(
      nodes,
      graphIndex.edges,
      graphIndex.clusters,
      [], // aiSuggestions populated later by AI engine
      graphIndex.mainBranches,
    );
  }

  /**
   * Handle a new thought entered in Aha mode.
   * Full flow:
   * 1. Create node (domain)
   * 2. Write markdown file (infra)
   * 3. Update graph-index.json (infra)
   * 4. Git add + commit (infra)
   */
  async handleNewThought(content: string, projectPath: string | null): Promise<ThoughtNode> {
    const title = content.split('\n')[0].slice(0, 60);
    const node = createNode(title, content);

    if (!projectPath) {
      // In-memory demo mode
      return node;
    }

    // 1. Write node file
    const nodePath = this.fs.nodePath(projectPath, node.id);
    const markdown = nodeToMarkdown(node);
    await this.fs.writeNode(nodePath, markdown);

    // 2. Update graph index
    const graphIndex = await this.fs.readGraphIndex(projectPath);
    const updatedIndex: GraphIndex = {
      ...graphIndex,
      nodes: [
        ...graphIndex.nodes,
        {
          id: node.id,
          filename: `${generateSlug(title)}.md`,
          title: node.title,
          status: node.status,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
          tags: node.tags,
        },
      ],
    };
    await this.fs.writeGraphIndex(projectPath, updatedIndex);

    // 3. Git commit
    const git = new TauriGitService(projectPath);
    const relativeNodePath = `nodes/${nodePath.split('/').pop()}`;
    await git.add(relativeNodePath);
    await git.add('graph-index.json');
    await git.commit(`新灵感: ${node.title}`);

    return node;
  }

  /**
   * Confirm an AI extension as a real branch.
   */
  async handleBranchConfirmation(
    parentNodeId: string,
    extensionContent: string,
    projectPath: string | null,
  ): Promise<{ node: ThoughtNode; edgeId: string }> {
    const title = extensionContent.split('\n')[0].slice(0, 60);
    const node = createNode(title, extensionContent);
    const edgeId = `edge-${parentNodeId}-${node.id}-${Date.now()}`;

    if (!projectPath) {
      return { node, edgeId };
    }

    const nodePath = this.fs.nodePath(projectPath, node.id);
    await this.fs.writeNode(nodePath, nodeToMarkdown(node));

    const graphIndex = await this.fs.readGraphIndex(projectPath);
    const updatedIndex: GraphIndex = {
      ...graphIndex,
      nodes: [
        ...graphIndex.nodes,
        {
          id: node.id,
          filename: `${generateSlug(title)}.md`,
          title: node.title,
          status: node.status,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
          tags: node.tags,
        },
      ],
      edges: [
        ...graphIndex.edges,
        {
          id: edgeId,
          sourceId: parentNodeId,
          targetId: node.id,
          type: 'user-confirmed',
        },
      ],
    };
    await this.fs.writeGraphIndex(projectPath, updatedIndex);

    const git = new TauriGitService(projectPath);
    const relativeNodePath = `nodes/${nodePath.split('/').pop()}`;
    await git.add(relativeNodePath);
    await git.add('graph-index.json');
    await git.commit(`确认分支: ${node.title}`);

    return { node, edgeId };
  }

  /**
   * Prune (archive) a branch with a user-supplied reason.
   */
  async handlePruning(nodeId: string, reason: string, projectPath: string | null): Promise<void> {
    if (!projectPath) return;

    const graphIndex = await this.fs.readGraphIndex(projectPath);
    const updatedIndex: GraphIndex = {
      ...graphIndex,
      nodes: graphIndex.nodes.map((n) =>
        n.id === nodeId ? { ...n, status: 'archived' as const } : n,
      ),
    };
    await this.fs.writeGraphIndex(projectPath, updatedIndex);

    const git = new TauriGitService(projectPath);
    await git.rm(`nodes/${nodeId}.md`);
    await git.add('graph-index.json');
    await git.commit(`修剪: ${reason}`);
  }

  /**
   * Mark a node as the root of a main branch.
   */
  async handleMarkMainBranch(
    _nodeId: string,
    name: string,
    projectPath: string | null,
  ): Promise<void> {
    if (!projectPath) return;

    const git = new TauriGitService(projectPath);
    await git.createTag(name, `标记主干方案: ${name}`);
  }
}

export const applicationService = new ApplicationService();
