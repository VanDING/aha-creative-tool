/**
 * OpenAI-Compatible AI Adapter
 *
 * Covers 95%+ of AI providers: DeepSeek, Ollama, Groq, 智谱, 通义, OpenRouter, etc.
 */

import type { AIAdapter, StreamParams, StructuredParams, StreamChunk, ChatMessage } from '../types';

export interface OpenAICompatConfig {
  baseURL: string;
  apiKey: string;
  chatCompletionsPath?: string;
  authType?: 'bearer' | 'custom-header' | 'query-param';
  authHeaderName?: string;
  extraHeaders?: Record<string, string>;
}

interface OpenAIStreamChoice {
  delta: {
    content?: string;
    role?: string;
  };
  index: number;
  finish_reason: string | null;
}

interface OpenAIStreamChunk {
  id?: string;
  object?: string;
  choices?: OpenAIStreamChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number };
}

interface OpenAICompletionChunk {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
}

export class OpenAICompatAdapter implements AIAdapter {
  constructor(private config: OpenAICompatConfig) {}

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...this.config.extraHeaders,
    };

    const authType = this.config.authType || 'bearer';
    if (this.config.apiKey) {
      if (authType === 'bearer') {
        headers.Authorization = `Bearer ${this.config.apiKey}`;
      } else if (authType === 'custom-header') {
        headers[this.config.authHeaderName || 'X-API-Key'] = this.config.apiKey;
      }
      // query-param is handled in URL if needed; rarely used for chat completions
    }

    return headers;
  }

  private getEndpoint(): string {
    const path = this.config.chatCompletionsPath ?? '/chat/completions';
    const base = this.config.baseURL.replace(/\/$/, '');
    return `${base}${path}`;
  }

  async *generateStream(params: StreamParams): AsyncIterable<StreamChunk> {
    const messages: ChatMessage[] = [];
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    messages.push(...params.messages);

    const response = await fetch(this.getEndpoint(), {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: params.model,
        messages,
        temperature: params.temperature ?? 0.7,
        max_tokens: params.maxTokens,
        stream: true,
      }),
      signal: params.abortSignal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === ': keep-alive') continue;
          if (trimmed.startsWith(':')) continue;

          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') {
              yield { type: 'done' };
              continue;
            }

            try {
              const parsed = JSON.parse(data) as OpenAIStreamChunk;
              const delta = parsed.choices?.[0]?.delta;
              if (delta?.content) {
                yield { type: 'text', content: delta.content };
              }
              if (parsed.choices?.[0]?.finish_reason) {
                yield { type: 'done' };
              }
            } catch {
              // Ignore malformed SSE chunks
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async generateStructured<T>(params: StructuredParams): Promise<T> {
    const messages: ChatMessage[] = [];
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    messages.push(...params.messages);

    const response = await fetch(this.getEndpoint(), {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify({
        model: params.model,
        messages,
        response_format: { type: 'json_object' },
        stream: false,
      }),
      signal: params.abortSignal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const data = (await response.json()) as OpenAICompletionChunk;
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty structured response');
    }

    try {
      return JSON.parse(content) as T;
    } catch (err) {
      throw new Error(`Invalid JSON in structured response: ${err}`);
    }
  }
}
