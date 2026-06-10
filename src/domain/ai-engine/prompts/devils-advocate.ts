import { buildSystemPrompt, buildUserMessage, PERSONA_DEVILS_ADVOCATE } from './system-prompts';
import type { CoreMemory, L2Context } from './system-prompts';

export function buildDevilsAdvocatePrompt(
  coreMemory: CoreMemory,
  l2Context: L2Context,
): { system: string; user: string } {
  return {
    system: buildSystemPrompt(coreMemory, PERSONA_DEVILS_ADVOCATE),
    user: buildUserMessage(l2Context, '请从批判性视角审视上述焦点节点。'),
  };
}
