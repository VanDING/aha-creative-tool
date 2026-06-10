/**
 * AHA Summary Generator — Domain Core
 *
 * Builds summary data from graph state and project metadata.
 */

import type { GraphData, ThoughtNode } from '../graph-engine/types';

export interface SummaryData {
  title: string;
  journey: string;
  nodeCount: number;
  branchCount: number;
  prunedCount: number;
  mainBranchName?: string;
  suggestedName: string;
  deliverables: string[];
}

export interface SummaryInput {
  projectName: string;
  graphData: GraphData;
  sessionStartedAt?: string;
  sessionEndedAt?: string;
}

export class SummaryGenerator {
  generate(input: SummaryInput): SummaryData {
    const nodes = input.graphData.nodes;
    const branches = input.graphData.mainBranches;
    const archived = input.graphData.archivedBranches ?? [];

    const mainBranch = branches[branches.length - 1];
    const mainBranchName = mainBranch?.name;

    const duration = this.computeDuration(input.sessionStartedAt, input.sessionEndedAt);

    const journey = this.buildJourneyText({
      projectName: input.projectName,
      nodeCount: nodes.length,
      branchCount: branches.length,
      prunedCount: archived.length,
      mainBranchName,
      duration,
    });

    return {
      title: `${input.projectName} — 思考旅程回顾`,
      journey,
      nodeCount: nodes.length,
      branchCount: branches.length,
      prunedCount: archived.length,
      mainBranchName,
      suggestedName: this.suggestName(input.projectName, mainBranchName),
      deliverables: this.buildDeliverables(mainBranch, nodes),
    };
  }

  private computeDuration(start?: string, end?: string): string {
    if (!start || !end) return '未知时长';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const minutes = Math.round(ms / 60000);
    if (minutes < 60) return `${minutes} 分钟`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} 小时`;
    const days = Math.round(hours / 24);
    return `${days} 天`;
  }

  private buildJourneyText(params: {
    projectName: string;
    nodeCount: number;
    branchCount: number;
    prunedCount: number;
    mainBranchName?: string;
    duration: string;
  }): string {
    const conclusion = params.mainBranchName
      ? `最终选定了「${params.mainBranchName}」作为主干方案。`
      : '还没有标记最终主干方案，思考仍在继续。';

    return `你从 ${params.nodeCount} 个碎片开始，
在 ${params.duration} 的探索中尝试了 ${params.branchCount} 条分支，
修剪了 ${params.prunedCount} 个不再相关的方向。
${conclusion}`;
  }

  private suggestName(projectName: string, mainBranchName?: string): string {
    if (mainBranchName) return mainBranchName;
    const prefixes = ['觉醒', '脉络', '旅程', '蓝图', '种子'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return `${projectName} · ${prefix}版`;
  }

  private buildDeliverables(
    mainBranch?: { nodeIds: string[] },
    nodes: ThoughtNode[] = [],
  ): string[] {
    if (!mainBranch) return ['继续积累想法，再回来标记主干方案'];
    const pathNodes = mainBranch.nodeIds
      .map((id) => nodes.find((n) => n.id === id))
      .filter(Boolean) as ThoughtNode[];

    return pathNodes.map((n) => n.title);
  }
}

export const summaryGenerator = new SummaryGenerator();
