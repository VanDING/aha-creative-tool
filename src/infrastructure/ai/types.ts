/**
 * AHA AI Gateway — Shared Types
 */

export type AITaskType =
  | 'extension'
  | 'devils-advocate'
  | 'association-scan'
  | 'deviation-detect'
  | 'summary';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamChunk {
  type: 'text' | 'done' | 'error';
  content?: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface StreamParams {
  model: string;
  systemPrompt?: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  abortSignal?: AbortSignal;
}

export interface StructuredParams {
  model: string;
  systemPrompt?: string;
  messages: ChatMessage[];
  abortSignal?: AbortSignal;
}

export interface AIAdapter {
  generateStream(params: StreamParams): AsyncIterable<StreamChunk>;
  generateStructured<T>(params: StructuredParams): Promise<T>;
}

export interface ModelConfig {
  id: string;
  name: string;
  capabilities: {
    streaming: boolean;
    structuredOutput: boolean;
    maxContextTokens: number;
    maxOutputTokens: number;
  };
  defaults?: {
    temperature?: number;
    maxTokens?: number;
  };
}

export interface ProviderConfig {
  id: string;
  name: string;
  protocol: 'openai-compatible' | 'anthropic';
  baseURL: string;
  apiKeyRef?: string;
  models: ModelConfig[];
  enabled: boolean;
  authType?: 'bearer' | 'custom-header' | 'query-param';
  authHeaderName?: string;
  extraHeaders?: Record<string, string>;
  modelNameOverrides?: Record<string, string>;
}

export interface ModelRef {
  providerId: string;
  modelId: string;
}

export interface ModelRoutingTable {
  defaultModel: ModelRef;
  taskModels: Partial<Record<AITaskType, ModelRef>>;
  backgroundModel?: ModelRef;
}

export interface ConnectionTestResult {
  success: boolean;
  latency: number;
  modelsFound: number;
  error?: string;
}
