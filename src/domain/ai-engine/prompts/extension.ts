import { buildSystemPrompt, buildUserMessage, PERSONA_EXTENSION } from './system-prompts';
import type { CoreMemory, L2Context } from './system-prompts';

export function buildExtensionPrompt(
  coreMemory: CoreMemory,
  l2Context: L2Context,
): { system: string; user: string } {
  return {
    system: buildSystemPrompt(coreMemory, PERSONA_EXTENSION),
    user: buildUserMessage(l2Context, '请针对上述焦点节点生成多方向探索建议。'),
  };
}
