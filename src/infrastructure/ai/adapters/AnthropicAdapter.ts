/**
 * Anthropic Native AI Adapter
 *
 * Implements Anthropic Messages API with SSE streaming.
 */

import type { AIAdapter, StreamParams, StructuredParams, StreamChunk, ChatMessage } from '../types';

export interface AnthropicConfig {
  baseURL: string;
  apiKey: string;
  extraHeaders?: Record<string, string>;
}

interface AnthropicStreamChunk {
  type: 'content_block_delta' | 'content_block_start' | 'message_delta' | 'message_stop';
  delta?: {
    text?: string;
    stop_reason?: string;
  };
  content_block?: {
    text?: string;
  };
}

interface AnthropicCompletion {
  content: Array<{ type: string; text: string }>;
}

export class AnthropicAdapter implements AIAdapter {
  constructor(private config: AnthropicConfig) {}

  private buildHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.config.apiKey,
      'anthropic-version': '2023-06-01',
      Accept: 'text/event-stream',
      ...this.config.extraHeaders,
    };
  }

  private splitSystemAndMessages(params: StreamParams | StructuredParams): {
    system?: string;
    messages: ChatMessage[];
  } {
    const messages = [...params.messages];
    let system: string | undefined = params.systemPrompt;

    // If system prompt was embedded as first message, extract it
    if (!system && messages[0]?.role === 'system') {
      system = messages[0].content;
      messages.shift();
    }

    return { system, messages };
  }

  async *generateStream(params: StreamParams): AsyncIterable<StreamChunk> {
    const { system, messages } = this.splitSystemAndMessages(params);

    const body: Record<string, unknown> = {
      model: params.model,
      messages,
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.7,
      stream: true,
    };
    if (system) body.system = system;

    const response = await fetch(`${this.config.baseURL}/messages`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
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
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') {
              yield { type: 'done' };
              continue;
            }

            try {
              const parsed = JSON.parse(data) as AnthropicStreamChunk;
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                yield { type: 'text', content: parsed.delta.text };
              }
              if (parsed.type === 'message_stop' || parsed.delta?.stop_reason) {
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
    const { system, messages } = this.splitSystemAndMessages(params);

    // Inject JSON instruction into the last user message for structured output
    const modifiedMessages = messages.map((m, idx) => {
      if (m.role === 'user' && idx === messages.length - 1) {
        return {
          ...m,
          content: `${m.content}\n\nRespond ONLY with valid JSON.`,
        };
      }
      return m;
    });

    const body: Record<string, unknown> = {
      model: params.model,
      messages: modifiedMessages,
      max_tokens: 4096,
      temperature: 0.2,
    };
    if (system) body.system = system;

    const response = await fetch(`${this.config.baseURL}/messages`, {
      method: 'POST',
      headers: this.buildHeaders(),
      body: JSON.stringify(body),
      signal: params.abortSignal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => 'Unknown error');
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const data = (await response.json()) as AnthropicCompletion;
    const content = data.content?.[0]?.text;
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
