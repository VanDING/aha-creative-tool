import { buildSystemPrompt, PERSONA_SUMMARY } from './system-prompts';
import type { CoreMemory } from './system-prompts';

export interface SummaryContext {
  nodeCount: number;
  branchCount: number;
  prunedCount: number;
  mainBranchName?: string;
  sessionDurationMinutes?: number;
}

export function buildSummaryPrompt(
  coreMemory: CoreMemory,
  context: SummaryContext,
): { system: string; user: string } {
  const user = `本次 Zen 会话数据：
- 节点总数：${context.nodeCount}
- 探索分支数：${context.branchCount}
- 修剪分支数：${context.prunedCount}
- 主干方案：${context.mainBranchName || '（暂未标记）'}
- 会话时长：${context.sessionDurationMinutes ?? '（未知）'} 分钟

请生成一段温暖的思考旅程回顾，并给出一个命名建议。`;

  return {
    system: buildSystemPrompt(coreMemory, PERSONA_SUMMARY),
    user,
  };
}
