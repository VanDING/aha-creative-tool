/**
 * AHA Review Engine — Domain Core
 *
 * Provides structured critique generation by type.
 */

import type { AIGatewayLike } from '../ai-engine/AIEngine';
import { AIEngine } from '../ai-engine/AIEngine';
import type { CoreMemory } from '../memory-system/types';
import type { L2Context } from '../memory-system/types';
import type { CritiqueChunk, CritiqueType } from '../ai-engine/types';

const CRITIQUE_TYPE_LABELS: Record<CritiqueType, string> = {
  'logical-flaw': '逻辑漏洞',
  'risk-analysis': '风险分析',
  'alternative-view': '反方视角',
  'completeness-check': '完整性检查',
};

export interface ReviewEngineOptions {
  gateway: AIGatewayLike;
}

export class ReviewEngine {
  private engine: AIEngine;

  constructor(options: ReviewEngineOptions) {
    this.engine = new AIEngine({ gateway: options.gateway });
  }

  async *generateCritique(
    _targetNodeId: string,
    coreMemory: CoreMemory,
    l2Context: L2Context,
    critiqueType: CritiqueType,
    signal?: AbortSignal,
  ): AsyncIterable<CritiqueChunk> {
    // Reuse devils advocate stream with a type-specific prefix
    const typeLabel = CRITIQUE_TYPE_LABELS[critiqueType];
    let buffer = '';

    for await (const text of this.engine.generateDevilsAdvocate(coreMemory, l2Context, signal)) {
      buffer += text;
      // Yield incremental chunks for streaming UI
      yield {
        type: critiqueType,
        severity: 'suggestion',
        content: text,
      };
    }

    if (!buffer.trim()) {
      yield {
        type: critiqueType,
        severity: 'suggestion',
        content: `【${typeLabel}】未生成有效内容。`,
      };
    }
  }
}
