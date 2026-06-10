import { buildSystemPrompt, PERSONA_ASSOCIATION_SCAN } from './system-prompts';
import type { CoreMemory } from './system-prompts';

export interface AssociationScanContext {
  newNodeId: string;
  newNodeTitle: string;
  newNodeContent: string;
  existingNodes: Array<{ id: string; title: string; content: string }>;
}

export function buildAssociationScanPrompt(
  coreMemory: CoreMemory,
  context: AssociationScanContext,
): { system: string; user: string } {
  const nodesList = context.existingNodes
    .map((n) => `- id: ${n.id}\n  title: ${n.title}\n  content: ${n.content.slice(0, 200)}`)
    .join('\n');

  const user = `新节点：
id: ${context.newNodeId}
title: ${context.newNodeTitle}
content: ${context.newNodeContent}

已有节点：
${nodesList}

请分析新节点与已有节点的潜在关联，只输出 JSON。`;

  return {
    system: buildSystemPrompt(coreMemory, PERSONA_ASSOCIATION_SCAN),
    user,
  };
}
