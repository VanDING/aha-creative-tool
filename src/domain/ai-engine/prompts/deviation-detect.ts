import { buildSystemPrompt, PERSONA_DEVIATION_DETECT } from './system-prompts';
import type { CoreMemory } from './system-prompts';

export function buildDeviationDetectPrompt(
  coreMemory: CoreMemory,
  input: string,
  recentContext: string[],
): { system: string; user: string } {
  const recent = recentContext.length ? recentContext.map((c) => `- ${c}`).join('\n') : '（无）';

  const user = `用户输入：
${input}

最近上下文：
${recent}

请判断该输入是否与当前项目相关，只输出 JSON。`;

  return {
    system: buildSystemPrompt(coreMemory, PERSONA_DEVIATION_DETECT),
    user,
  };
}
