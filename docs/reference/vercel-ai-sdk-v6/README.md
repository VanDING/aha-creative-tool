# Vercel AI SDK v6 Reference Documentation

- **Official docs**: https://ai-sdk.dev/docs
- **GitHub**: https://github.com/vercel/ai
- **Version**: v6.x (latest, as of 2026-06)
- **Install**: `npm i ai`

## Key API Summary

### streamText — Streaming Text Generation

```ts
import { streamText } from 'ai';

const result = streamText({
  model: anthropic('claude-sonnet-4-6'),
  system: 'You are a helpful assistant.',
  prompt: 'Tell me a story.',
  // messages: [...],                    // alternative to prompt
  tools: {                              // optional tool definitions
    myTool: {
      description: '...',
      parameters: z.object({ ... }),
      execute: async (args) => { ... }
    }
  },
  onError({ error }) { console.error(error); },
  onChunk({ chunk }) {
    // chunk types: text, reasoning, source, tool-call, 
    //   tool-input-start, tool-input-delta, tool-result, raw
  },
  onFinish({ text, finishReason, usage, steps, totalUsage }) {},
  experimental_transform: smoothStream(), // or [transform1, transform2]
  // experimental_onStart, experimental_onStepStart, etc.
  // abortSignal: ...                    // NOT in page — need to verify
});

// Async iteration over text
for await (const textPart of result.textStream) {
  process.stdout.write(textPart);
}

// Full stream with all event types
for await (const part of result.fullStream) {
  switch (part.type) {
    case 'text-delta': console.log(part.textDelta); break;
    case 'tool-call': console.log(part); break;
    case 'error': console.error(part.error); break;
    case 'finish': console.log(part.finishReason); break;
  }
}

// After stream completes, access these promises:
const text = await result.text;
const usage = await result.usage;
const steps = await result.steps;

// HTTP response helpers
result.toTextStreamResponse();           // → Response
result.toUIMessageStreamResponse();      // → Response
result.pipeTextStreamToResponse(res);    // Node.js
```

### generateText — Non-Streaming

```ts
import { generateText } from 'ai';

const result = await generateText({
  model: openai('gpt-4o'),
  prompt: 'What is the capital of France?',
  system: 'Be concise.',
  // tools, onFinish, experimental_* similar to streamText
});

const text = result.text;
const usage = result.totalUsage;
```

### generateObject — Structured Output

```ts
import { generateObject } from 'ai';
import { z } from 'zod';

const { object } = await generateObject({
  model: openai('gpt-4o-mini'),
  schema: z.object({
    recipe: z.object({
      name: z.string(),
      ingredients: z.array(z.object({
        name: z.string(),
        amount: z.string()
      })),
      steps: z.array(z.string()),
    }),
  }),
  prompt: 'Generate a lasagna recipe.',
  system: '...',
  // messages, abortSignal, onFinish, experimental_*
});
```

### Provider Setup (from dedicated provider packages)

```ts
import { openai } from '@ai-sdk/openai';
// npm i @ai-sdk/openai
// Reads OPENAI_API_KEY from env by default

import { anthropic } from '@ai-sdk/anthropic';
// npm i @ai-sdk/anthropic
// Reads ANTHROPIC_API_KEY from env by default

// Usage:
const model = openai('gpt-4o');
const model = anthropic('claude-sonnet-4-6');
```

> ⚠️ **Unconfirmed for AHA**: Need to verify how to pass API key at runtime
> instead of via environment variable. Possible approaches:
> - `createOpenAI({ apiKey: '...' })` 
> - Custom fetch middleware
> - `openai('model-id', { apiKey: '...' })`

### Ollama / OpenAI-compatible Provider

Ollama is OpenAI-compatible. Likely approach:
```ts
import { createOpenAI } from '@ai-sdk/openai';
const ollama = createOpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama',  // Ollama doesn't require real key
});
const model = ollama('llama3:8b');
```

### Error Handling

- `streamText`: Errors are suppressed, use `onError` callback to log
- `fullStream`: Handle `case 'error'` and `case 'tool-error'`
- Experimental callbacks: "Errors are silently caught"
- `result.warnings`: Array of provider warnings

### Stream Transformation (smoothStream)

```ts
import { smoothStream, streamText } from 'ai';
const result = streamText({
  model,
  prompt,
  experimental_transform: smoothStream({
    delayInMs: 10,      // optional
    chunking: 'word',   // 'word' | 'line' | 'sentence'
  }),
});
```

### Missing from this doc (need separate pages)
- `AbortController` / abortSignal usage
- Dynamic API key injection patterns
- Custom provider creation
- `generateObject` detailed params
- Ollama-specific setup guide
