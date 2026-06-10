/**
 * AHA Deviation Detector — Domain Core
 *
 * Thin wrapper around AIEngine.detectDeviation for classification tasks.
 */

import type { AIGatewayLike } from '../ai-engine/AIEngine';
import { AIEngine } from '../ai-engine/AIEngine';
import type { CoreMemory } from '../memory-system/types';
import type { DeviationResult } from '../ai-engine/types';

export interface DeviationDetectorOptions {
  gateway: AIGatewayLike;
}

export class DeviationDetector {
  private engine: AIEngine;

  constructor(options: DeviationDetectorOptions) {
    this.engine = new AIEngine({ gateway: options.gateway });
  }

  async check(
    input: string,
    coreMemory: CoreMemory,
    recentContext: string[] = [],
    signal?: AbortSignal,
  ): Promise<DeviationResult> {
    return this.engine.detectDeviation(coreMemory, input, recentContext, signal);
  }
}
