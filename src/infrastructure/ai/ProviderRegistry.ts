/**
 * AI Provider Registry
 *
 * Manages user-configured AI providers (no keys stored here — only apiKeyRef).
 */

import type { ProviderConfig, ModelConfig } from './types';

export class ProviderRegistry {
  private providers: Map<string, ProviderConfig> = new Map();

  register(config: ProviderConfig): void {
    if (!config.id || !config.baseURL) {
      throw new Error('Provider must have id and baseURL');
    }
    this.providers.set(config.id, { ...config });
  }

  update(providerId: string, update: Partial<ProviderConfig>): void {
    const existing = this.providers.get(providerId);
    if (!existing) {
      throw new Error(`Provider not found: ${providerId}`);
    }
    this.providers.set(providerId, { ...existing, ...update, id: existing.id });
  }

  remove(providerId: string): void {
    this.providers.delete(providerId);
  }

  get(providerId: string): ProviderConfig | undefined {
    return this.providers.get(providerId);
  }

  list(): ProviderConfig[] {
    return Array.from(this.providers.values());
  }

  getModel(providerId: string, modelId: string): ModelConfig | undefined {
    const provider = this.providers.get(providerId);
    return provider?.models.find((m) => m.id === modelId);
  }
}
