/**
 * AI Model Router
 *
 * Maps task types to (provider, model) pairs based on user-configured routing table.
 */

import type { AITaskType, ModelRef, ModelRoutingTable, ProviderConfig } from './types';

export class ModelRouter {
  private routing: ModelRoutingTable = {
    defaultModel: { providerId: '', modelId: '' },
    taskModels: {},
  };

  setRoutingTable(routing: ModelRoutingTable): void {
    this.routing = routing;
  }

  getRoutingTable(): ModelRoutingTable {
    return { ...this.routing, taskModels: { ...this.routing.taskModels } };
  }

  resolve(taskType: AITaskType): ModelRef {
    return this.routing.taskModels[taskType] ?? this.routing.defaultModel;
  }

  validate(routing: ModelRoutingTable, providers: ProviderConfig[]): string | null {
    const refs = [
      routing.defaultModel,
      ...Object.values(routing.taskModels),
      routing.backgroundModel,
    ].filter((ref): ref is ModelRef => !!ref);

    for (const ref of refs) {
      const provider = providers.find((p) => p.id === ref.providerId);
      if (!provider) {
        return `Unknown provider: ${ref.providerId}`;
      }
      const model = provider.models.find((m) => m.id === ref.modelId);
      if (!model) {
        return `Unknown model ${ref.modelId} for provider ${ref.providerId}`;
      }
    }

    return null;
  }
}
