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

import { createNode, buildGraphData, findShortestPath } from '@domain/graph-engine/GraphEngine';
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
   * Handle batch thought input (Aha mode with splitter).
   * Splits raw input into multiple nodes, writes each, returns all.
   */
  async handleNewThoughts(raw: string, projectPath: string | null): Promise<ThoughtNode[]> {
    const { splitIdeas } = await import('@domain/idea-splitter/IdeaSplitter');
    const items = splitIdeas(raw);
    if (items.length === 0) return [];

    const nodes: ThoughtNode[] = [];
    for (const item of items) {
      const node = await this.handleNewThought(item.content, projectPath);
      // Override title with splitter's shorter title (handleNewThought takes first line)
      node.title = item.title;
      nodes.push(node);
    }

    return nodes;
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

  /**
   * Export a delivery package for a main branch.
   * Generates PROJECT_CONTEXT.md + DEVELOPMENT_PACK.md in exports/.
   */
  async exportDeliveryPackage(
    mainBranchId: string,
    projectPath: string | null,
    graphData?: GraphData,
  ): Promise<{ projectContext: string; developmentPack: string }> {
    if (!projectPath) {
      return {
        projectContext: '# PROJECT_CONTEXT.md\n\n（未关联项目）',
        developmentPack: '# DEVELOPMENT_PACK.md\n\n（未关联项目）',
      };
    }

    const data = graphData ?? (await this.buildGraphData(projectPath));
    const branch = data.mainBranches.find((b) => b.id === mainBranchId);
    const rootNodeId = branch?.nodeIds[0];

    if (!rootNodeId) {
      throw new Error('Main branch not found or empty');
    }

    // Collect path from root to deepest leaf
    const leafCandidates = data.nodes.filter((n) => data.edges.every((e) => e.sourceId !== n.id));
    let pathNodeIds: string[] = [rootNodeId];
    for (const leaf of leafCandidates) {
      const path = findShortestPath(rootNodeId, leaf.id, data);
      if (path.length > pathNodeIds.length) {
        pathNodeIds = path;
      }
    }

    const pathNodes = pathNodeIds
      .map((id) => data.nodes.find((n) => n.id === id))
      .filter(Boolean) as ThoughtNode[];

    const nodeSummaries = pathNodes
      .map((n, idx) => `${idx + 1}. **${n.title}**\n${n.content}`)
      .join('\n\n');

    const constitutionPath = `${projectPath}/project-constitution.md`;
    let constitution = '';
    try {
      constitution = await this.fs.readNode(constitutionPath);
    } catch {
      constitution = '（项目宪章未找到）';
    }

    const projectContext = `# PROJECT_CONTEXT.md

## 项目宪章
${constitution}

## 主干方案：${branch?.name ?? '未命名'}

${nodeSummaries}
`;

    const developmentPack = `# DEVELOPMENT_PACK.md

## 目标
基于主干方案「${branch?.name ?? '未命名'}」生成可执行交付物。

## 实施步骤
${pathNodes.map((n, idx) => `${idx + 1}. ${n.title}`).join('\n')}

## 风险提示
- 本方案基于当前思考阶段的收敛结果，后续可能随认知迭代而调整。
- 建议定期回顾项目宪章，确保实施不偏离核心目标。

## 参考资料
- 项目路径：${projectPath}
- 生成时间：${new Date().toISOString()}
`;

    const exportsDir = `${projectPath}/exports`;
    await this.fs.writeNode(`${exportsDir}/PROJECT_CONTEXT.md`, projectContext);
    await this.fs.writeNode(`${exportsDir}/DEVELOPMENT_PACK.md`, developmentPack);

    const git = new TauriGitService(projectPath);
    await git.add('exports/PROJECT_CONTEXT.md');
    await git.add('exports/DEVELOPMENT_PACK.md');
    await git.commit(`导出构建包: ${branch?.name ?? mainBranchId}`);

    return { projectContext, developmentPack };
  }
}

export const applicationService = new ApplicationService();
