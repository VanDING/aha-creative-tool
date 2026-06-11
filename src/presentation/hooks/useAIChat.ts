import { useCallback } from 'react';
import { AIService } from '@application/services/AIService';
import { useChatStore } from '@presentation/stores/chatStore';
import { useAISettingsStore } from '@presentation/stores/aiSettingsStore';
import type { AIPersona } from '@presentation/stores/chatStore';

/**
 * System prompts for each AI persona.
 */
const PERSONA_SYSTEM_PROMPTS: Record<AIPersona, string> = {
  'aha-ai': `你是 AHA-AI，一个创意发散伙伴。你的职责是帮助用户激荡想法。

行为准则：
- 当用户提出一个想法时，联想相关的方向、类比、可能性
- 追问"还有呢？""如果反过来呢？"来激发更多创意
- 当你觉得某个想法值得固化为节点时，用 [NODE: 标题] 标记
- 语气好奇、跳跃、充满可能性。不要急于收敛或批判。
- 当对话内容足够丰富（节点 > 8 或主题簇明显时），可以建议用户切换到 Zen 模式进行整理`,

  'zen-ai': `你是 ZEN-AI，一个深度分析伙伴。你的职责是帮助用户审视、批判、聚焦想法。

行为准则：
- 对脉络图进行整体分析，找出结构问题、逻辑漏洞、薄弱环节
- 当用户选中一个节点时，深度审视：这个想法有依据吗？有什么被忽略的？如果是恶意的反对者会怎么批评？
- 当你发现新的可挖掘方向时，用 [NODE: 标题] 标记建议创建节点
- 当某个节点缺乏支撑时，用 [PRUNE: 标题] 标记建议修剪
- 语气冷静、敏锐、务实。不夸赞，不说"很好"，直接给实质性分析`,
};

export function useAIChat() {
  const chatStore = useChatStore();
  const aiSettings = useAISettingsStore();

  /** Send a user message and stream the AI response */
  const send = useCallback(
    async (content: string, persona: AIPersona) => {
      const ai = AIService.getInstance();

      // Ensure gateway is configured
      if (!ai.isConfigured) {
        chatStore.addMessage({
          role: 'system',
          content: 'AI 尚未配置。请点击左下角设置按钮添加 AI 供应商和 API Key。',
        });
        return;
      }

      // Sync settings to gateway
      ai.configure(aiSettings.providers, aiSettings.routing!);

      // Add user message
      chatStore.addMessage({ role: 'user', content });

      // Start streaming
      const abortCtrl = new AbortController();
      chatStore.setStreaming(true);
      chatStore.setAbortController(abortCtrl);

      // Add placeholder assistant message
      chatStore.addMessage({ role: 'assistant', content: '' });

      try {
        // Build system prompt from L1 core memory + persona
        const coreMemory = ai.memory.getCoreMemory();
        const systemPrompt = buildSystemPrompt(coreMemory, persona);

        // Build conversation history
        const messages = chatStore.messages
          .filter((m) => m.role !== 'system')
          .slice(-20) // last 20 messages for context window
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));

        for await (const chunk of ai.gateway.streamGenerate(
          persona === 'aha-ai' ? 'extension' : 'devils-advocate',
          {
            systemPrompt,
            messages,
            temperature: persona === 'aha-ai' ? 0.9 : 0.6,
            maxTokens: 2048,
            abortSignal: abortCtrl.signal,
          },
        )) {
          if (chunk.type === 'text' && chunk.content) {
            chatStore.appendToLastAssistant(chunk.content);
          }
          if (chunk.type === 'error') {
            chatStore.appendToLastAssistant(`\n\n(${chunk.content})`);
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          // user canceled, nothing to do
        } else {
          chatStore.appendToLastAssistant(
            `\n\n(调用出错: ${err instanceof Error ? err.message : String(err)})`,
          );
        }
      } finally {
        chatStore.setStreaming(false);
        chatStore.setAbortController(null);
      }
    },
    [chatStore, aiSettings],
  );

  /** Cancel the current stream */
  const cancel = useCallback(() => {
    chatStore.abortController?.abort();
  }, [chatStore.abortController]);

  return { send, cancel };
}

/**
 * Build a system prompt combining L1 core memory and persona description.
 */
function buildSystemPrompt(
  coreMemory: ReturnType<AIService['memory']['getCoreMemory']>,
  persona: AIPersona,
): string {
  const personaPrompt = PERSONA_SYSTEM_PROMPTS[persona];
  const parts = [personaPrompt];

  if (coreMemory.projectGoal) {
    parts.unshift(`## 项目核心目标\n${coreMemory.projectGoal}`);
  }
  if (coreMemory.constraints.length) {
    parts.push(`## 约束条件\n${coreMemory.constraints.map((c) => `- ${c}`).join('\n')}`);
  }
  if (coreMemory.keyDecisions.length) {
    const recent = coreMemory.keyDecisions.slice(-3);
    parts.push(`## 关键决策\n${recent.map((d) => `- ${d.decision}: ${d.reason}`).join('\n')}`);
  }

  return parts.join('\n\n');
}
