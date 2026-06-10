# Vercel AI SDK — Provider Setup Reference

Based on research of AI SDK v6 provider patterns.

- **Docs**: https://ai-sdk.dev/providers/ai-sdk-providers
- **Version**: v6.x

## Dedicated Provider Setup

### OpenAI

```bash
npm i @ai-sdk/openai
```

```ts
import { openai, createOpenAI } from '@ai-sdk/openai';

// Default — reads OPENAI_API_KEY from env
const model = openai('gpt-4o');

// Custom API key (runtime injection) ⚠️ confirm with latest docs
const customOpenAI = createOpenAI({
  apiKey: 'sk-...',
  // Optionally override baseURL:
  // baseURL: 'https://api.deepseek.com/v1',
});
const model = customOpenAI('gpt-4o');
```

### Anthropic

```bash
npm i @ai-sdk/anthropic
```

```ts
import { anthropic, createAnthropic } from '@ai-sdk/anthropic';

// Default — reads ANTHROPIC_API_KEY from env
const model = anthropic('claude-sonnet-4-6');

// Custom API key ⚠️ confirm with latest docs
const customAnthropic = createAnthropic({
  apiKey: 'sk-ant-...',
});
```

### Ollama / OpenAI-compatible

Ollama exposes an OpenAI-compatible endpoint at `http://localhost:11434/v1`.

```ts
import { createOpenAI } from '@ai-sdk/openai';

const ollama = createOpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama',  // Ollama doesn't require a real key
});

const model = ollama('llama3:8b');
```

### DeepSeek / 智谱 / 通义千问 / any OpenAI-compatible

```ts
const deepseek = createOpenAI({
  baseURL: 'https://api.deepseek.com/v1',
  apiKey: 'sk-...',
});
const model = deepseek('deepseek-chat');

const zhipu = createOpenAI({
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
  apiKey: '...',
});
const model = zhipu('glm-4');
```

## For AHA: Runtime API Key Pattern

The key pattern for AHA is to create a fresh provider instance at call time
with the API key from the credential store:

```ts
// In AIGateway — NOT using env vars
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';

async function createModel(providerConfig: ProviderConfig) {
  const apiKey = await credentialStore.getKey(providerConfig.id);
  
  switch (providerConfig.protocol) {
    case 'openai-compatible':
      return createOpenAI({
        baseURL: providerConfig.baseURL,
        apiKey: apiKey,
      })(providerConfig.modelId);
      
    case 'anthropic':
      return createAnthropic({
        baseURL: providerConfig.baseURL,
        apiKey: apiKey,
      })(providerConfig.modelId);
  }
}

// Then pass to streamText:
const model = await createModel(providerConfig);
const result = streamText({ model, system, messages });
```

> ⚠️ **NEEDS VERIFICATION**: The `createOpenAI` and `createAnthropic` functions
> with `apiKey` parameter need to be confirmed against the latest `@ai-sdk/openai`
> and `@ai-sdk/anthropic` package versions. If the API doesn't support runtime
> key injection directly, alternatives include:
> - Custom `fetch` wrapper that injects the Authorization header
> - Middleware pattern in the AI SDK
> - Environment variable override at process level (not recommended for Tauri)

## generateObject Full API

```ts
import { generateObject } from 'ai';
import { z } from 'zod';

const { object, usage, finishReason, warnings } = await generateObject({
  model: openai('gpt-4o'),
  schema: z.object({
    name: z.string(),
    items: z.array(z.string()),
  }),
  system: 'Extract structured data.',
  prompt: 'The recipe for pancakes is...',
  // messages: [...],          // alternative to prompt
  temperature: 0.1,
  maxTokens: 1000,
  // abortSignal: controller.signal,      // ⚠️ confirm
  // onFinish: ({ object, usage, ... }) => {},
  // experimental_* callbacks available
});

// object is typed as { name: string; items: string[] }
```

### generateObject with Stream (partial JSON streaming)

```ts
import { streamObject } from 'ai';

const { partialObjectStream } = streamObject({
  model: openai('gpt-4o'),
  schema: z.object({ ... }),
  prompt: '...',
});

for await (const partialObject of partialObjectStream) {
  console.log(partialObject);  // progressively complete
}
```
