/**
 * AHA AI Gateway
 *
 * Central hub for all AI calls. Handles provider registry, model routing,
 * credential retrieval, adapter selection, and error classification.
 */

import type {
  AITaskType,
  ProviderConfig,
  ModelRoutingTable,
  ChatMessage,
  StreamChunk,
  ConnectionTestResult,
} from './types';
import { ProviderRegistry } from './ProviderRegistry';
import { ModelRouter } from './ModelRouter';
import { AdapterFactory } from './AdapterFactory';
import type { CredentialStore } from '../credentials/TauriCredentialStore';

export interface StreamGenerateOptions {
  systemPrompt: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  abortSignal?: AbortSignal;
}

export interface StructuredGenerateOptions {
  systemPrompt: string;
  messages: ChatMessage[];
  abortSignal?: AbortSignal;
}

export class AIGateway {
  private registry = new ProviderRegistry();
  private router = new ModelRouter();
  private adapterFactory = new AdapterFactory();

  constructor(private credentialStore: CredentialStore) {}

  // Provider management
  registerProvider(config: ProviderConfig): void {
    this.registry.register(config);
  }

  updateProvider(providerId: string, update: Partial<ProviderConfig>): void {
    this.registry.update(providerId, update);
  }

  removeProvider(providerId: string): void {
    this.registry.remove(providerId);
  }

  listProviders(): ProviderConfig[] {
    return this.registry.list();
  }

  // Routing
  setRoutingTable(routing: ModelRoutingTable): void {
    const validation = this.router.validate(routing, this.registry.list());
    if (validation) {
      throw new Error(validation);
    }
    this.router.setRoutingTable(routing);
  }

  getRoutingTable(): ModelRoutingTable {
    return this.router.getRoutingTable();
  }

  private async resolveModel(taskType: AITaskType) {
    const ref = this.router.resolve(taskType);
    const provider = this.registry.get(ref.providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${ref.providerId}`);
    }
    const model = provider.models.find((m) => m.id === ref.modelId);
    if (!model) {
      throw new Error(`Model not found: ${ref.modelId}`);
    }

    let apiKey = '';
    if (provider.apiKeyRef) {
      const key = await this.credentialStore.getKey(provider.apiKeyRef);
      apiKey = key || '';
    }

    const modelId = provider.modelNameOverrides?.[ref.modelId] ?? ref.modelId;
    return { provider, model, apiKey, modelId };
  }

  async *streamGenerate(
    taskType: AITaskType,
    options: StreamGenerateOptions,
  ): AsyncIterable<StreamChunk> {
    const { provider, apiKey, modelId } = await this.resolveModel(taskType);
    const adapter = this.adapterFactory.createAdapter(provider, apiKey);

    try {
      for await (const chunk of adapter.generateStream({
        model: modelId,
        systemPrompt: options.systemPrompt,
        messages: options.messages,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        abortSignal: options.abortSignal,
      })) {
        yield chunk;
      }
    } catch (error) {
      yield this.classifyError(error);
    }
  }

  async generateStructured<T>(
    taskType: AITaskType,
    options: StructuredGenerateOptions,
  ): Promise<T> {
    const { provider, apiKey, modelId } = await this.resolveModel(taskType);
    const adapter = this.adapterFactory.createAdapter(provider, apiKey);

    return adapter.generateStructured<T>({
      model: modelId,
      systemPrompt: options.systemPrompt,
      messages: options.messages,
      abortSignal: options.abortSignal,
    });
  }

  async testConnection(providerId: string): Promise<ConnectionTestResult> {
    const provider = this.registry.get(providerId);
    if (!provider) {
      return {
        success: false,
        latency: 0,
        modelsFound: 0,
        error: `Provider not found: ${providerId}`,
      };
    }

    const start = performance.now();
    try {
      // For OpenAI-compatible providers we can hit /models endpoint
      const base = provider.baseURL.replace(/\/$/, '');
      let apiKey = '';
      if (provider.apiKeyRef) {
        apiKey = (await this.credentialStore.getKey(provider.apiKeyRef)) || '';
      }

      const response = await fetch(`${base}/models`, {
        headers:
          provider.authType === 'custom-header'
            ? { [provider.authHeaderName || 'X-API-Key']: apiKey }
            : { Authorization: `Bearer ${apiKey}` },
      });

      const latency = Math.round(performance.now() - start);
      if (!response.ok) {
        return {
          success: false,
          latency,
          modelsFound: 0,
          error: `HTTP ${response.status}`,
        };
      }

      const data = (await response.json()) as { data?: Array<{ id: string }> };
      const modelsFound = data.data?.length ?? 0;
      return { success: true, latency, modelsFound };
    } catch (error) {
      return {
        success: false,
        latency: Math.round(performance.now() - start),
        modelsFound: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private classifyError(error: unknown): StreamChunk {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { type: 'done' };
      }
      const msg = error.message.toLowerCase();
      if (msg.includes('401') || msg.includes('403')) {
        return { type: 'error', content: 'API Key 无效，请检查 AI 设置' };
      }
      if (msg.includes('429')) {
        return { type: 'error', content: 'API 速率限制，请稍后重试' };
      }
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('connection')) {
        return { type: 'error', content: `连接失败: ${error.message}` };
      }
      return { type: 'error', content: `AI 调用出错: ${error.message}` };
    }
    return { type: 'error', content: `AI 调用出错: ${String(error)}` };
  }
}
