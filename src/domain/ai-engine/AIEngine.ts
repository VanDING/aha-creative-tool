/**
 * AHA AI Engine — Domain Core
 *
 * Pure orchestration of AI calls: extension, devil's advocate, association scan,
 * and summary generation. Depends on AIGateway (injected) and prompt templates.
 */

import type { AITaskType, StreamChunk, ChatMessage } from '@infrastructure/ai/types';
import type { CoreMemory, L2Context } from './prompts/system-prompts';
import {
  buildExtensionPrompt,
  buildDevilsAdvocatePrompt,
  buildAssociationScanPrompt,
  buildDeviationDetectPrompt,
  buildSummaryPrompt,
} from './prompts';
import type { ExtensionChunk, SuggestedAssociation, DeviationResult } from './types';

export interface AIGatewayLike {
  streamGenerate(
    taskType: AITaskType,
    options: {
      systemPrompt: string;
      messages: ChatMessage[];
      temperature?: number;
      maxTokens?: number;
      abortSignal?: AbortSignal;
    },
  ): AsyncIterable<StreamChunk>;
  generateStructured<T>(
    taskType: AITaskType,
    options: {
      systemPrompt: string;
      messages: ChatMessage[];
      abortSignal?: AbortSignal;
    },
  ): Promise<T>;
}

export interface AIEngineOptions {
  gateway: AIGatewayLike;
}

export class AIEngine {
  constructor(private options: AIEngineOptions) {}

  async *generateExtensions(
    coreMemory: CoreMemory,
    l2Context: L2Context,
    signal?: AbortSignal,
  ): AsyncIterable<ExtensionChunk> {
    const { system, user } = buildExtensionPrompt(coreMemory, l2Context);

    let currentDirectionId = '';
    let buffer = '';

    for await (const chunk of this.options.gateway.streamGenerate('extension', {
      systemPrompt: system,
      messages: [{ role: 'user', content: user }],
      temperature: 0.8,
      maxTokens: 2048,
      abortSignal: signal,
    })) {
      if (chunk.type === 'done') {
        if (buffer.trim()) {
          yield {
            type: 'content',
            directionId: currentDirectionId,
            content: buffer,
          };
        }
        yield { type: 'done' };
        return;
      }

      if (chunk.type === 'error') {
        yield { type: 'done' };
        return;
      }

      if (!chunk.content) continue;

      const text = chunk.content;
      buffer += text;

      // Detect direction boundaries: ### Title
      const match = buffer.match(/###\s+(.+?)\n/);
      if (match && match[1].trim() !== currentDirectionId) {
        if (currentDirectionId) {
          const prevContent = buffer.slice(0, match.index).trim();
          yield {
            type: 'content',
            directionId: currentDirectionId,
            content: prevContent,
          };
        }
        currentDirectionId = match[1].trim();
        yield {
          type: 'direction',
          directionId: currentDirectionId,
          title: currentDirectionId,
        };
        buffer = buffer.slice(match.index! + match[0].length);
      }

      // Yield incremental content for the current direction
      if (currentDirectionId && buffer.length > 50) {
        const toYield = buffer;
        buffer = '';
        yield {
          type: 'content',
          directionId: currentDirectionId,
          content: toYield,
        };
      }
    }
  }

  async *generateDevilsAdvocate(
    coreMemory: CoreMemory,
    l2Context: L2Context,
    signal?: AbortSignal,
  ): AsyncIterable<string> {
    const { system, user } = buildDevilsAdvocatePrompt(coreMemory, l2Context);

    for await (const chunk of this.options.gateway.streamGenerate('devils-advocate', {
      systemPrompt: system,
      messages: [{ role: 'user', content: user }],
      temperature: 0.7,
      maxTokens: 2048,
      abortSignal: signal,
    })) {
      if (chunk.type === 'done' || chunk.type === 'error') return;
      if (chunk.content) yield chunk.content;
    }
  }

  async scanAssociations(
    coreMemory: CoreMemory,
    newNodeId: string,
    newNodeTitle: string,
    newNodeContent: string,
    allNodes: Array<{ id: string; title: string; content: string }>,
    signal?: AbortSignal,
  ): Promise<SuggestedAssociation[]> {
    const existingNodes = allNodes.filter((n) => n.id !== newNodeId);
    const { system, user } = buildAssociationScanPrompt(coreMemory, {
      newNodeId,
      newNodeTitle,
      newNodeContent,
      existingNodes,
    });

    try {
      const result = await this.options.gateway.generateStructured<{
        associations: Array<{ nodeId: string; strength: number; reason: string }>;
      }>('association-scan', {
        systemPrompt: system,
        messages: [{ role: 'user', content: user }],
        abortSignal: signal,
      });

      return (result.associations || [])
        .filter((a) => a.nodeId !== newNodeId)
        .map((a) => ({
          nodeAId: newNodeId,
          nodeBId: a.nodeId,
          strength: Math.max(0, Math.min(1, a.strength ?? 0)),
          reason: a.reason || '',
        }));
    } catch {
      return [];
    }
  }

  async detectDeviation(
    coreMemory: CoreMemory,
    input: string,
    recentContext: string[],
    signal?: AbortSignal,
  ): Promise<DeviationResult> {
    const { system, user } = buildDeviationDetectPrompt(coreMemory, input, recentContext);

    try {
      const result = await this.options.gateway.generateStructured<DeviationResult>(
        'deviation-detect',
        {
          systemPrompt: system,
          messages: [{ role: 'user', content: user }],
          abortSignal: signal,
        },
      );
      return {
        type: result.type ?? 'uncertain',
        confidence: Math.max(0, Math.min(1, result.confidence ?? 0)),
        message: result.message,
      };
    } catch {
      return { type: 'uncertain', confidence: 0 };
    }
  }

  async *generateSummary(
    coreMemory: CoreMemory,
    context: {
      nodeCount: number;
      branchCount: number;
      prunedCount: number;
      mainBranchName?: string;
      sessionDurationMinutes?: number;
    },
    signal?: AbortSignal,
  ): AsyncIterable<string> {
    const { system, user } = buildSummaryPrompt(coreMemory, context);

    for await (const chunk of this.options.gateway.streamGenerate('summary', {
      systemPrompt: system,
      messages: [{ role: 'user', content: user }],
      temperature: 0.8,
      maxTokens: 1024,
      abortSignal: signal,
    })) {
      if (chunk.type === 'done' || chunk.type === 'error') return;
      if (chunk.content) yield chunk.content;
    }
  }
}
