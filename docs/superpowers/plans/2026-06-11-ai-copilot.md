# AI Copilot + Smart Splitter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire AI as an active Copilot into both Aha and Zen modes, and add smart multi-idea input splitting.

**Architecture:** A shared `AIService` singleton owns `AIGateway` + `AIEngine` + `MemorySystem`. Both modes use the same service but pass different AI persona configs (`AHA-AI` for divergent brainstorming, `ZEN-AI` for convergent deep analysis). `IdeaSplitter` is a pure domain function with no AI dependency. The chat panel is a reusable component shared across modes with layout-animated repositioning via Motion.

**Tech Stack:** React 18 + TypeScript + Motion + Zustand + existing domain/infrastructure layers

---

## File Map

```
New files (11):
  src/domain/idea-splitter/IdeaSplitter.ts           — Pure split function
  src/application/services/AIService.ts              — AI singleton: gateway + engine + memory
  src/presentation/components/common/ChatView.tsx     — Reusable chat panel (Aha + Zen)
  src/presentation/components/common/ChatMessage.tsx  — Single chat bubble
  src/presentation/components/common/AIStatusBar.tsx  — Micro-awareness footer
  src/presentation/components/common/SettingsEntry.tsx — Bottom-left settings launcher
  src/presentation/components/AhaMode/CardFlow.tsx    — Vertical node card list (Aha right panel)
  src/presentation/components/ZenMode/ZenChatView.tsx — Zen chat panel wrapper
  src/presentation/hooks/useAIChat.ts                 — Shared chat state + send logic
  src/presentation/stores/chatStore.ts                — Chat message store

Modified files (7):
  src/application/services/ApplicationService.ts     — handleNewThought uses splitter
  src/presentation/components/AhaMode/AhaMode.tsx    — New left-chat + right-cards layout
  src/presentation/components/ZenMode/ZenMode.tsx    — New left-canvas + right-chat layout
  src/App.tsx                                        — Mode-aware layout container
  src/presentation/components/common/ModeSwitch.tsx  — Chat panel slide animation
  src/presentation/stores/appStore.ts                — Add orphanNodeIds, chatPanelSide
  src/domain/graph-engine/GraphEngine.ts             — Add detectOrphanNodes()
```

---

### Phase 1: IdeaSplitter (Domain, Zero AI)

### Task 1: IdeaSplitter domain function

**Files:**
- Create: `src/domain/idea-splitter/IdeaSplitter.ts`
- Create: `src/domain/idea-splitter/IdeaSplitter.test.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// src/domain/idea-splitter/IdeaSplitter.test.ts
import { describe, it, expect } from 'vitest';
import { splitIdeas } from './IdeaSplitter';

describe('splitIdeas', () => {
  it('returns single item for simple input', () => {
    const result = splitIdeas('AI觉醒');
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('AI觉醒');
    expect(result[0].content).toBe('AI觉醒');
  });

  it('splits on newlines', () => {
    const result = splitIdeas('AI觉醒\n母子关系\n股市崩盘');
    expect(result).toHaveLength(3);
    expect(result[0].title).toBe('AI觉醒');
    expect(result[1].title).toBe('母子关系');
    expect(result[2].title).toBe('股市崩盘');
  });

  it('splits on Chinese period 。', () => {
    const result = splitIdeas('AI觉醒是核心主题。母子关系是情感主线');
    expect(result).toHaveLength(2);
  });

  it('splits on Chinese semicolon ；', () => {
    const result = splitIdeas('探索AI权利；探讨人类未来');
    expect(result).toHaveLength(2);
  });

  it('splits on English period followed by space+uppercase', () => {
    const result = splitIdeas('AI will rise. Humans will adapt');
    expect(result).toHaveLength(2);
  });

  it('does NOT split on English period mid-sentence', () => {
    const result = splitIdeas('Dr. Smith studied AI ethics');
    expect(result).toHaveLength(1);
  });

  it('does NOT split comma/dun-hao unless items are very long', () => {
    // Short items separated by comma → stay together
    const result = splitIdeas('苹果、香蕉、橘子');
    expect(result).toHaveLength(1);
  });

  it('trims whitespace and filters empty items', () => {
    const result = splitIdeas('  AI觉醒  \n\n  母子关系  \n  ');
    expect(result).toHaveLength(2);
  });

  it('uses first 60 chars as title, full text as content', () => {
    const longLine =
      '这是一个非常长的想法它超过了六十个字符限制所以标题会被截断但内容保留完整原文';
    const result = splitIdeas(longLine);
    expect(result[0].title.length).toBeLessThanOrEqual(60);
    expect(result[0].content).toBe(longLine);
  });

  it('handles mixed delimiters', () => {
    const input = 'AI觉醒\n母子关系；股市崩盘。写诗的程序';
    const result = splitIdeas(input);
    expect(result).toHaveLength(4);
  });

  it('handles empty input', () => {
    expect(splitIdeas('')).toHaveLength(0);
    expect(splitIdeas('   \n  \n ')).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/domain/idea-splitter/IdeaSplitter.test.ts`
Expected: FAIL — `splitIdeas` not defined

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/domain/idea-splitter/IdeaSplitter.ts

export interface SplitItem {
  /** Short title (first 60 chars) */
  title: string;
  /** Full text of this item */
  content: string;
}

/**
 * Split a multi-idea input string into individual thought items.
 *
 * Splitting rules (in precedence order):
 *   1. Newlines (\n, \r\n) — unconditional split
 *   2. Chinese period 。— unconditional split
 *   3. Chinese semicolon ；— unconditional split
 *   4. English period . — split only when followed by space + uppercase letter
 *   5. Comma/dun-hao (, ，、) — do NOT split (keep as single item)
 */
export function splitIdeas(raw: string): SplitItem[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // Step 1: split on newlines first
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());

  // Step 2: for each line, split on strong Chinese delimiters
  const items: string[] = [];
  for (const line of lines) {
    // Split on 。and ；, keep delimiter attached to preceding segment
    const subItems = line
      .split(/(?<=[。；])/)
      .filter((s) => s.trim())
      .map((s) => {
        // Split on English period only when followed by space + uppercase
        return s.split(/(?<=\.)\s+(?=[A-Z])/).filter((x) => x.trim());
      })
      .flat();

    items.push(...subItems);
  }

  return items.map((item) => {
    const clean = item.trim();
    return {
      title: clean.slice(0, 60),
      content: clean,
    };
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/domain/idea-splitter/IdeaSplitter.test.ts`
Expected: PASS — all 10 tests

- [ ] **Step 5: Commit**

```bash
git add src/domain/idea-splitter/
git commit -m "feat: add IdeaSplitter domain function for multi-idea input"
```

---

### Phase 2: AI Infrastructure Wiring

### Task 2: Create AIService singleton

**Files:**
- Create: `src/application/services/AIService.ts`

- [ ] **Step 1: Wire AIService — gateway + engine + memory in one place**

```typescript
// src/application/services/AIService.ts

import { AIGateway } from '@infrastructure/ai/AIGateway';
import { AIEngine } from '@domain/ai-engine/AIEngine';
import { MemorySystem } from '@domain/memory-system/MemorySystem';
import { TauriCredentialStore } from '@infrastructure/credentials/TauriCredentialStore';
import type { ProviderConfig, ModelRoutingTable } from '@infrastructure/ai/types';
import type { CoreMemory } from '@domain/memory-system/types';
import type { GraphData, ThoughtNode } from '@domain/graph-engine/types';

let _instance: AIService | null = null;

export class AIService {
  public gateway: AIGateway;
  public engine: AIEngine;
  public memory: MemorySystem;

  private constructor() {
    const credentialStore = new TauriCredentialStore();
    this.gateway = new AIGateway(credentialStore);
    this.engine = new AIEngine({ gateway: this.gateway });
    this.memory = new MemorySystem();
  }

  static getInstance(): AIService {
    if (!_instance) {
      _instance = new AIService();
    }
    return _instance;
  }

  /** true when providers + routing are both configured */
  get isConfigured(): boolean {
    return this.gateway.listProviders().length > 0 && !!this.gateway.getRoutingTable();
  }

  /** Configure from persisted settings (called on app mount / after settings change) */
  configure(providers: ProviderConfig[], routing: ModelRoutingTable): void {
    // Clear and rebuild registry
    for (const p of this.gateway.listProviders()) {
      this.gateway.removeProvider(p.id);
    }
    for (const p of providers) {
      this.gateway.registerProvider(p);
    }
    this.gateway.setRoutingTable(routing);
  }

  /** Initialize L1 core memory for a project */
  initCoreMemory(projectGoal: string, constraints: string[] = [], projectType = 'other'): void {
    this.memory.updateCoreMemory({
      projectGoal,
      constraints,
      keyDecisions: [],
      projectType,
    });
  }

  /** Scan associations for a newly created node (used in Aha mode). Returns results that can be cached. */
  async scanAssociationsForNode(
    newNode: ThoughtNode,
    graphData: GraphData,
  ): Promise<Array<{ nodeBId: string; strength: number; reason: string }>> {
    if (!this.isConfigured) return [];

    const coreMemory = this.memory.getCoreMemory();
    const allNodes = graphData.nodes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content.slice(0, 500),
    }));

    return this.engine.scanAssociations(
      coreMemory,
      newNode.id,
      newNode.title,
      newNode.content.slice(0, 500),
      allNodes,
    );
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc -b --noEmit`
Expected: No errors related to `AIService`

- [ ] **Step 3: Commit**

```bash
git add src/application/services/AIService.ts
git commit -m "feat: add AIService singleton wiring Gateway + Engine + Memory"
```

---

### Task 3: Add chat messages store

**Files:**
- Create: `src/presentation/stores/chatStore.ts`

- [ ] **Step 1: Write chat store**

```typescript
// src/presentation/stores/chatStore.ts

import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  /** When this message auto-created a node */
  createdNodeId?: string;
}

export type AIPersona = 'aha-ai' | 'zen-ai';

export interface ChatState {
  /** All messages for the current session */
  messages: ChatMessage[];
  /** Currently active AI persona */
  persona: AIPersona;
  /** Whether AI is currently generating a response (streaming) */
  isStreaming: boolean;
  /** Abort controller for the current stream */
  abortController: AbortController | null;
}

export interface ChatActions {
  addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  appendToLastAssistant: (text: string) => void;
  setStreaming: (streaming: boolean) => void;
  setAbortController: (ctrl: AbortController | null) => void;
  setPersona: (persona: AIPersona) => void;
  clearMessages: () => void;
  /** Find message containing the given node id */
  messageForNode: (nodeId: string) => ChatMessage | undefined;
}

let msgCounter = 0;

export const useChatStore = create<ChatState & ChatActions>((set, get) => ({
  messages: [],
  persona: 'aha-ai',
  isStreaming: false,
  abortController: null,

  addMessage: (msg) =>
    set((s) => ({
      messages: [
        ...s.messages,
        {
          ...msg,
          id: `msg-${++msgCounter}-${Date.now()}`,
          timestamp: new Date().toISOString(),
        },
      ],
    })),

  appendToLastAssistant: (text) =>
    set((s) => {
      const msgs = [...s.messages];
      let lastIdx = msgs.length - 1;
      while (lastIdx >= 0 && msgs[lastIdx].role !== 'assistant') lastIdx--;
      if (lastIdx >= 0) {
        msgs[lastIdx] = { ...msgs[lastIdx], content: msgs[lastIdx].content + text };
      }
      return { messages: msgs };
    }),

  setStreaming: (isStreaming) => set({ isStreaming }),
  setAbortController: (abortController) => set({ abortController }),
  setPersona: (persona) => set({ persona }),
  clearMessages: () => set({ messages: [] }),

  messageForNode: (nodeId) => {
    return get().messages.find((m) => m.createdNodeId === nodeId);
  },
}));
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc -b --noEmit`
Expected: No errors from `chatStore`

- [ ] **Step 3: Commit**

```bash
git add src/presentation/stores/chatStore.ts
git commit -m "feat: add chatStore for AI conversation state"
```

---

### Task 4: Add `detectOrphanNodes()` to GraphEngine

**Files:**
- Modify: `src/domain/graph-engine/GraphEngine.ts` (append new export)

- [ ] **Step 1: Add the function**

Append to the end of `src/domain/graph-engine/GraphEngine.ts`:

```typescript
/**
 * Detect nodes that have zero edges (completely disconnected from the graph).
 * These are "orphan" ideas that may indicate deviation from the project focus.
 */
export function detectOrphanNodes(graphData: GraphData): string[] {
  const connected = new Set<string>();
  for (const edge of graphData.edges) {
    connected.add(edge.sourceId);
    connected.add(edge.targetId);
  }
  for (const edge of graphData.aiSuggestions) {
    connected.add(edge.sourceId);
    connected.add(edge.targetId);
  }
  return graphData.nodes
    .filter((n) => !connected.has(n.id) && n.status === 'active')
    .map((n) => n.id);
}
```

- [ ] **Step 2: Add tests**

Append to `src/domain/graph-engine/GraphEngine.test.ts`:

```typescript
import { detectOrphanNodes, buildGraphData } from './GraphEngine';

describe('detectOrphanNodes', () => {
  it('returns empty for fully connected graph', () => {
    const nodes = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }].map(toTestNode);
    const gd = buildGraphData(nodes);
    const gd2 = addEdge(gd, 'a', 'b', 'user-confirmed');
    expect(detectOrphanNodes(gd2)).toHaveLength(0);
  });

  it('detects nodes with no edges', () => {
    const nodes = [
      { id: 'a', title: 'A' },
      { id: 'b', title: 'B' },
      { id: 'c', title: 'C' },
    ].map(toTestNode);
    const gd = buildGraphData(nodes);
    const gd2 = addEdge(gd, 'a', 'b', 'user-confirmed');
    const orphans = detectOrphanNodes(gd2);
    expect(orphans).toContain('c');
    expect(orphans).not.toContain('a');
    expect(orphans).not.toContain('b');
  });

  it('treats ai-suggested edges as connections', () => {
    const nodes = [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }].map(toTestNode);
    const gd = buildGraphData(nodes);
    const gd2 = addEdge(gd, 'a', 'b', 'ai-suggested', '', 0.7);
    expect(detectOrphanNodes(gd2)).toHaveLength(0);
  });

  it('excludes archived nodes from orphans', () => {
    const nodes = [
      { id: 'a', title: 'A', status: 'active' },
      { id: 'b', title: 'B', status: 'archived' },
    ].map(toTestNode);
    const gd = buildGraphData(nodes);
    expect(detectOrphanNodes(gd)).toEqual(['a']);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/domain/graph-engine/GraphEngine.test.ts`
Expected: All new + existing tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/domain/graph-engine/GraphEngine.ts src/domain/graph-engine/GraphEngine.test.ts
git commit -m "feat: add detectOrphanNodes() to GraphEngine"
```

---

### Task 5: Wire ApplicationService to use IdeaSplitter

**Files:**
- Modify: `src/application/services/ApplicationService.ts`

- [ ] **Step 1: Add `handleNewThoughts()` method**

Append before the closing `}` of `ApplicationService`:

```typescript
  /**
   * Handle batch thought input (Aha mode with splitter).
   * Splits raw input into multiple nodes, writes each, returns all.
   */
  async handleNewThoughts(
    raw: string,
    projectPath: string | null,
  ): Promise<ThoughtNode[]> {
    const { splitIdeas } = await import('@domain/idea-splitter/IdeaSplitter');
    const items = splitIdeas(raw);
    if (items.length === 0) return [];

    const nodes: ThoughtNode[] = [];
    for (const item of items) {
      const node = await this.handleNewThought(item.content, projectPath);
      // Override title with splitter's shorter title (handleNewThought takes first line)
      node.title = item.title;
      nodes.push(node);
    }

    return nodes;
  }
```

- [ ] **Step 2: Modify `handleNewThought` to accept optional title override**

The existing `handleNewThought` uses `content.split('\n')[0].slice(0, 60)` as title. No change needed — the splitter already produces items with correct titles. We just need to ensure the markdown file contains the full content.

- [ ] **Step 3: Run existing tests**

Run: `npx vitest run src/application/services/ApplicationService.test.ts`
Expected: All existing tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/application/services/ApplicationService.ts
git commit -m "feat: add handleNewThoughts() with IdeaSplitter integration"
```

---

### Phase 3: Reusable Chat UI Components

### Task 6: Create ChatView component

**Files:**
- Create: `src/presentation/components/common/ChatView.tsx`
- Create: `src/presentation/components/common/ChatMessage.tsx`

- [ ] **Step 1: Create ChatMessage bubble**

```typescript
// src/presentation/components/common/ChatMessage.tsx

import { motion } from 'motion/react';
import type { ChatMessage as ChatMessageType } from '@presentation/stores/chatStore';

export interface ChatMessageProps {
  message: ChatMessageType;
  personaColor: string;
  personaName: string;
}

export function ChatMessageBubble({ message, personaColor, personaName }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <div className="text-center text-xs py-2" style={{ color: 'var(--text-muted)' }}>
        {message.content}
      </div>
    );
  }

  return (
    <motion.div
      className={`flex gap-2 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {!isUser && (
        <div
          className="w-6 h-6 rounded-full flex-shrink-0 mt-1 text-xs flex items-center justify-center text-white"
          style={{ backgroundColor: personaColor }}
        >
          {personaName[0]}
        </div>
      )}
      <div
        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isUser ? 'text-white' : ''
        }`}
        style={
          isUser
            ? { backgroundColor: 'var(--accent)' }
            : { backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }
        }
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
      {isUser && (
        <div className="w-6 h-6 rounded-full flex-shrink-0 mt-1 text-xs flex items-center justify-center" style={{ backgroundColor: 'var(--text-muted)' }}>
          U
        </div>
      )}
    </motion.div>
  );
}
```

- [ ] **Step 2: Create ChatView container**

```typescript
// src/presentation/components/common/ChatView.tsx

import { useRef, useEffect, useState } from 'react';
import { Send, Square } from 'lucide-react';
import { ChatMessageBubble } from './ChatMessage';
import { useChatStore } from '@presentation/stores/chatStore';
import type { AIPersona } from '@presentation/stores/chatStore';

export interface ChatViewProps {
  /** Which persona is active (impacts header styling) */
  persona: AIPersona;
  /** Color for avatar/accent */
  personaColor: string;
  /** Display name */
  personaName: string;
  /** Handler for sending a message (returns void, chatStore handles streaming) */
  onSend: (content: string) => void;
  /** Handler for canceling a stream */
  onCancel: () => void;
  /** Optional pinned node context shown above input (Zen mode) */
  contextLabel?: string;
}

export function ChatView({
  persona,
  personaColor,
  personaName,
  onSend,
  onCancel,
  contextLabel,
}: ChatViewProps) {
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ color: 'var(--text)' }}>
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: personaColor }}
        />
        {personaName}
        {isStreaming && (
          <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            正在思考…
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="text-center text-sm mt-16" style={{ color: 'var(--text-muted)' }}>
            {persona === 'aha-ai'
              ? '倾倒你的想法，AI 会帮你发散和联想…'
              : '选择节点进行深度分析，或直接讨论整体脉络…'}
          </div>
        )}
        {messages.map((msg) => (
          <ChatMessageBubble
            key={msg.id}
            message={msg}
            personaColor={personaColor}
            personaName={personaName}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Context label (Zen: which node is being analyzed) */}
      {contextLabel && (
        <div
          className="px-4 py-1.5 text-xs border-t"
          style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
        >
          分析对象：{contextLabel}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={persona === 'aha-ai' ? '继续说你的想法…' : '深度分析…'}
            className="flex-1 px-3 py-2 bg-transparent outline-none resize-none text-sm rounded-xl"
            style={{ border: '1px solid var(--border)', color: 'var(--text)', maxHeight: '120px' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />
          {isStreaming ? (
            <button
              onClick={onCancel}
              className="p-2 rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)' }}
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="p-2 rounded-xl transition-colors disabled:opacity-40"
              style={{ backgroundColor: personaColor, color: '#fff' }}
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc -b --noEmit`
Expected: No errors from new components

- [ ] **Step 4: Commit**

```bash
git add src/presentation/components/common/ChatView.tsx src/presentation/components/common/ChatMessage.tsx
git commit -m "feat: add reusable ChatView and ChatMessage components"
```

---

### Task 7: Create the shared `useAIChat` hook

**Files:**
- Create: `src/presentation/hooks/useAIChat.ts`

- [ ] **Step 1: Write the hook**

```typescript
// src/presentation/hooks/useAIChat.ts

import { useCallback } from 'react';
import { AIService } from '@application/services/AIService';
import { useChatStore } from '@presentation/stores/chatStore';
import { useAppStore } from '@presentation/stores/appStore';
import { useAISettingsStore } from '@presentation/stores/aiSettingsStore';
import type { AIPersona } from '@presentation/stores/chatStore';
import type { GraphData } from '@domain/graph-engine/types';

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
  const graphData = useAppStore((s) => s.graphData);
  const projectPath = useAppStore((s) => s.currentProjectPath);
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
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
function buildSystemPrompt(coreMemory: ReturnType<AIService['memory']['getCoreMemory']>, persona: AIPersona): string {
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
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc -b --noEmit`
Expected: No errors from `useAIChat`

- [ ] **Step 3: Commit**

```bash
git add src/presentation/hooks/useAIChat.ts
git commit -m "feat: add useAIChat hook with dual-persona system prompts"
```

---

### Phase 4: Aha Mode Redesign

### Task 8: Create CardFlow component

**Files:**
- Create: `src/presentation/components/AhaMode/CardFlow.tsx`

- [ ] **Step 1: Write CardFlow**

```typescript
// src/presentation/components/AhaMode/CardFlow.tsx

import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@presentation/stores/appStore';
import { detectOrphanNodes } from '@domain/graph-engine/GraphEngine';

export function CardFlow() {
  const nodes = useAppStore((s) => s.graphData.nodes.filter((n) => n.status !== 'archived'));
  const orphanIds = new Set(detectOrphanNodes(useAppStore.getState().graphData));
  const selectNode = useAppStore((s) => s.selectNode);

  return (
    <div className="flex flex-col h-full">
      <div
        className="px-4 py-3 text-xs font-medium border-b"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
      >
        想法节点 · {nodes.length}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        <AnimatePresence>
          {[...nodes].reverse().map((node) => (
            <motion.div
              key={node.id}
              className="px-3 py-2.5 rounded-xl cursor-pointer transition-shadow hover:shadow-md"
              style={{
                backgroundColor: 'var(--surface)',
                border: orphanIds.has(node.id)
                  ? '1px dashed #f87171'
                  : '1px solid var(--border)',
              }}
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              onClick={() => selectNode(node.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className="text-sm font-medium truncate flex-1"
                  style={{ color: 'var(--text)' }}
                >
                  {node.title}
                </p>
                {node.status === 'main-branch' && (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#22c55e20', color: '#22c55e' }}>
                    主干
                  </span>
                )}
                {orphanIds.has(node.id) && (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#f8717120', color: '#f87171' }}>
                    游离
                  </span>
                )}
              </div>
              {node.content !== node.title && (
                <p
                  className="text-xs mt-1 line-clamp-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {node.content.slice(0, 120)}
                </p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {nodes.length === 0 && (
          <div className="text-center text-sm mt-16" style={{ color: 'var(--text-muted)' }}>
            还没有节点，在左侧对话中输入你的想法
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/presentation/components/AhaMode/CardFlow.tsx
git commit -m "feat: add CardFlow component for Aha mode right panel"
```

---

### Task 9: Redesign AhaMode layout

**Files:**
- Modify: `src/presentation/components/AhaMode/AhaMode.tsx`
- Modify: `src/presentation/components/AhaMode/QuickInput.tsx` (minor: wire splitter)
- Create: `src/presentation/components/common/AIStatusBar.tsx`
- Create: `src/presentation/components/common/SettingsEntry.tsx`

- [ ] **Step 1: Create AIStatusBar**

```typescript
// src/presentation/components/common/AIStatusBar.tsx

import { AIService } from '@application/services/AIService';
import { useAppStore } from '@presentation/stores/appStore';

export function AIStatusBar() {
  const nodeCount = useAppStore((s) => s.graphData.nodes.length);
  const aiSuggestionsCount = useAppStore((s) => s.graphData.aiSuggestions.length);
  const isConfigured = AIService.getInstance().isConfigured;

  if (!isConfigured) {
    return (
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs z-30"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        配置 AI 后，你的想法将自动产生关联
      </div>
    );
  }

  if (nodeCount === 0) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs z-30"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
    >
      AI 已分析 {nodeCount} 个节点
      {aiSuggestionsCount > 0 && `，发现 ${aiSuggestionsCount} 组潜在关联`}
    </div>
  );
}
```

- [ ] **Step 2: Create SettingsEntry**

```typescript
// src/presentation/components/common/SettingsEntry.tsx

import { Settings } from 'lucide-react';
import { useAppStore } from '@presentation/stores/appStore';

export function SettingsEntry() {
  const openAISettings = useAppStore((s) => s.openAISettings);

  return (
    <button
      onClick={openAISettings}
      className="fixed bottom-4 left-4 z-50 p-2 rounded-full transition-colors hover:opacity-80"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      title="AI 设置"
    >
      <Settings size={18} />
    </button>
  );
}
```

- [ ] **Step 3: Rewrite AhaMode with new layout**

```typescript
// src/presentation/components/AhaMode/AhaMode.tsx

import { motion } from 'motion/react';
import { QuickInput } from './QuickInput';
import { MobileQuickInput } from './MobileQuickInput';
import { CardFlow } from './CardFlow';
import { ChatView } from '../common/ChatView';
import { AIStatusBar } from '../common/AIStatusBar';
import { SettingsEntry } from '../common/SettingsEntry';
import { useMediaQuery } from '@presentation/hooks/useMediaQuery';
import { useAIChat } from '@presentation/hooks/useAIChat';
import { useChatStore } from '@presentation/stores/chatStore';

export function AhaMode() {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const { send, cancel } = useAIChat();
  const persona = useChatStore((s) => s.persona);

  const handleSend = (content: string) => {
    send(content, 'aha-ai');
  };

  return (
    <motion.div
      className="flex w-full h-full overflow-hidden"
      style={{ backgroundColor: 'var(--bg)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Left: Chat */}
      <motion.div
        className="h-full border-r"
        style={{ width: '50%', borderColor: 'var(--border)' }}
        layout
      >
        <ChatView
          persona="aha-ai"
          personaColor="#f59e0b"
          personaName="AHA-AI"
          onSend={handleSend}
          onCancel={cancel}
        />
      </motion.div>

      {/* Right: Card Flow + Quick Input */}
      <div className="h-full flex flex-col" style={{ width: '50%' }}>
        <CardFlow />
        <div className="relative">
          {isMobile ? <MobileQuickInput /> : <QuickInput />}
        </div>
      </div>

      <AIStatusBar />
      <SettingsEntry />
    </motion.div>
  );
}
```

- [ ] **Step 4: Update QuickInput to use splitter + trigger AI scan**

Modify the `handleSubmit` in `QuickInput.tsx` to call `handleNewThoughts` and trigger AI scanning:

```typescript
// In QuickInput.tsx, replace the handleSubmit function:

const handleSubmit = async () => {
  const raw = ahaInputBuffer.trim();
  if (!raw) return;

  setAhaInputBuffer('');
  if (textareaRef.current) {
    textareaRef.current.style.height = 'auto';
  }

  // Split + create nodes
  const nodes = await applicationService.handleNewThoughts(raw, projectPath);
  for (const node of nodes) {
    addNode(node);
  }

  // Also add user message to chat
  if (nodes.length > 0) {
    useChatStore.getState().addMessage({
      role: 'user',
      content: raw,
    });
  }

  // Trigger AI association scan (background, fire-and-forget)
  const ai = (await import('@application/services/AIService')).AIService.getInstance();
  if (ai.isConfigured) {
    const state = useAppStore.getState();
    for (const node of nodes) {
      void ai.scanAssociationsForNode(node, state.graphData).then((associations) => {
        if (associations.length > 0) {
          // Add AI suggestions to graphData
          const currentState = useAppStore.getState();
          const aiSuggestions = associations.map((a) => ({
            id: `ais-${node.id}-${a.nodeBId}-${Date.now()}`,
            sourceId: node.id,
            targetId: a.nodeBId,
            type: 'ai-suggested' as const,
            confidence: a.strength,
            reason: a.reason,
            label: a.reason,
          }));
          useAppStore.setState({
            graphData: {
              ...currentState.graphData,
              aiSuggestions: [
                ...currentState.graphData.aiSuggestions,
                ...aiSuggestions,
              ],
            },
          });
        }
      });
    }
  }

  // Auto-generate AI response to the new thoughts
  void send(raw, 'aha-ai');
};
```

Note: this needs `send` from `useAIChat`. Import `useAIChat` in QuickInput.

- [ ] **Step 5: Verify TypeScript and existing tests**

Run: `npx tsc -b --noEmit && npx vitest run`
Expected: Zero TS errors, all existing tests pass

- [ ] **Step 6: Commit**

```bash
git add src/presentation/components/AhaMode/AhaMode.tsx \
        src/presentation/components/AhaMode/QuickInput.tsx \
        src/presentation/components/common/AIStatusBar.tsx \
        src/presentation/components/common/SettingsEntry.tsx
git commit -m "feat: redesign Aha mode with left-chat + right-card layout"
```

---

### Phase 5: Zen Mode Redesign

### Task 10: Create ZenChatView + Progressive AI edge reveal

**Files:**
- Create: `src/presentation/components/ZenMode/ZenChatView.tsx`
- Modify: `src/presentation/components/ZenMode/ZenMode.tsx`
- Modify: `src/presentation/components/ZenMode/GraphCanvas.tsx` (add orphan styling)

- [ ] **Step 1: Create ZenChatView**

```typescript
// src/presentation/components/ZenMode/ZenChatView.tsx

import { useCallback } from 'react';
import { ChatView } from '../common/ChatView';
import { useAIChat } from '@presentation/hooks/useAIChat';
import { useAppStore } from '@presentation/stores/appStore';

export function ZenChatView() {
  const { send, cancel } = useAIChat();
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const graphData = useAppStore((s) => s.graphData);

  const selectedNode = selectedNodeId
    ? graphData.nodes.find((n) => n.id === selectedNodeId)
    : null;

  const contextLabel = selectedNode
    ? `节点: ${selectedNode.title}`
    : '整体脉络';

  const handleSend = useCallback(
    (content: string) => {
      // If a node is selected, prepend context hint
      if (selectedNode) {
        const contextualContent = `[关于节点「${selectedNode.title}」] ${content}`;
        send(contextualContent, 'zen-ai');
      } else {
        send(content, 'zen-ai');
      }
    },
    [selectedNode, send],
  );

  return (
    <ChatView
      persona="zen-ai"
      personaColor="#3b82f6"
      personaName="ZEN-AI"
      onSend={handleSend}
      onCancel={cancel}
      contextLabel={contextLabel}
    />
  );
}
```

- [ ] **Step 2: Update ZenMode layout with split panels + progressive AI edge reveal**

```typescript
// src/presentation/components/ZenMode/ZenMode.tsx (full rewrite)

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { GraphCanvas } from './GraphCanvas';
import { GraphToolbar } from './GraphToolbar';
import { GraphControllerProvider } from './GraphControllerContext';
import { NodeCard } from './NodeCard';
import { UndoRedoButtons } from './UndoRedoButtons';
import { ExtensionPanel } from './ExtensionPanel';
import { ContextMenu } from './ContextMenu';
import { SearchPanel } from './SearchPanel';
import { ExportDialog } from '../ExportDialog/ExportDialog';
import { SummaryModal } from '../SummaryModal/SummaryModal';
import { ZenChatView } from './ZenChatView';
import { useAppStore } from '@presentation/stores/appStore';
import { useKeyboardShortcuts } from '@presentation/hooks/useKeyboardShortcuts';
import { AIService } from '@application/services/AIService';
import type { AIGatewayLike } from '@domain/ai-engine/AIEngine';

/** Use the real AIService as gateway for ExtensionPanel */
const realGateway: AIGatewayLike = {
  async *streamGenerate(taskType, options) {
    const ai = AIService.getInstance();
    for await (const chunk of ai.gateway.streamGenerate(taskType, options)) {
      yield chunk;
    }
  },
  async generateStructured(taskType, options) {
    const ai = AIService.getInstance();
    return ai.gateway.generateStructured(taskType, options);
  },
};

export function ZenMode() {
  const isSearchOpen = useAppStore((s) => s.isSearchOpen);
  const isExportOpen = useAppStore((s) => s.isExportOpen);
  const isSummaryOpen = useAppStore((s) => s.isSummaryOpen);
  const closeSummary = useAppStore((s) => s.closeSummary);
  const graphData = useAppStore((s) => s.graphData);
  const setGraphData = useAppStore((s) => s.setGraphData);

  // Progressive AI edge reveal
  const [revealAISuggestions, setRevealAISuggestions] = useState(false);
  const hasRevealed = useRef(false);

  useEffect(() => {
    if (!hasRevealed.current && graphData.aiSuggestions.length > 0) {
      const timer = setTimeout(() => {
        setRevealAISuggestions(true);
        hasRevealed.current = true;
      }, 1500); // 1.5s delay after mount
      return () => clearTimeout(timer);
    }
  }, [graphData.aiSuggestions.length]);

  // Filter graphData for progressive reveal
  const visibleGraphData = revealAISuggestions
    ? graphData
    : { ...graphData, aiSuggestions: [] };

  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    x: number;
    y: number;
  } | null>(null);

  const handleNodeContextMenu = useCallback((nodeId: string, x: number, y: number) => {
    setContextMenu({ nodeId, x, y });
  }, []);

  useKeyboardShortcuts();

  return (
    <motion.div
      className="flex w-full h-full overflow-hidden"
      style={{ backgroundColor: 'var(--bg)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => setContextMenu(null)}
    >
      {/* Left: Graph Canvas */}
      <motion.div
        className="h-full border-r relative overflow-hidden"
        style={{ width: '60%', borderColor: 'var(--border)' }}
        layout
      >
        <GraphControllerProvider>
          <GraphToolbar />
          <GraphCanvas onNodeContextMenu={handleNodeContextMenu} />
        </GraphControllerProvider>
        <NodeCard />
        <ExtensionPanel gateway={realGateway} />
        <UndoRedoButtons />
        <SearchPanel isOpen={isSearchOpen} onClose={useAppStore.getState().closeSearch} />
        <ExportDialog isOpen={isExportOpen} onClose={useAppStore.getState().closeExport} />
        <SummaryModal isOpen={isSummaryOpen} onClose={closeSummary} />

        {contextMenu && (
          <div
            className="absolute"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            onClick={(e) => e.stopPropagation()}
          >
            <ContextMenu nodeId={contextMenu.nodeId} onClose={() => setContextMenu(null)} />
          </div>
        )}
      </motion.div>

      {/* Right: Chat */}
      <motion.div
        className="h-full"
        style={{ width: '40%' }}
        layout
      >
        <ZenChatView />
      </motion.div>
    </motion.div>
  );
}
```

- [ ] **Step 3: Add orphan node visual styling to GraphCanvas**

In `GraphCanvas.tsx`, update `toG6Format` call to pass orphan information. The orphan detection runs in `CardFlow` already; in Zen, we style orphan nodes via G6. Modify the effect that syncs graph data:

```typescript
// In GraphCanvas.tsx, in the data sync useEffect, after toG6Format:

const g6Data = toG6Format(graphData, { dark: resolvedTheme === 'dark' });

// Tag orphan nodes with a distinct style
const orphanIds = new Set(
  /* dynamic import to avoid circular dep — or pass as prop */ 
);
// Mark orphan nodes visually: dashed red border
// This is handled inside toG6Format via edge detection
// (Orphan = node has zero edges AND status='active')
```

Since `toG6Format` already styles by `status`, and `detectOrphanNodes` returns IDs of nodes with zero edges, we can add orphan styling by checking edge connectivity during G6 format conversion. Add to `toG6Format` in `GraphEngine.ts`:

Append after the `statusStroke` definition:

```typescript
// Compute orphan node ids (nodes with zero connections)
const connectedNodeIds = new Set<string>();
for (const e of graphData.edges) {
  connectedNodeIds.add(e.sourceId);
  connectedNodeIds.add(e.targetId);
}
for (const e of graphData.aiSuggestions) {
  connectedNodeIds.add(e.sourceId);
  connectedNodeIds.add(e.targetId);
}
```

Then in the node style block, add before `base.style` assignment:

```typescript
const isOrphan = node.status === 'active' && !connectedNodeIds.has(node.id);
if (isOrphan) {
  base.style = {
    fill: dark ? '#1f2937' : '#ffffff',
    stroke: '#f87171',
    lineWidth: 1.5,
    r: 22,
    lineDash: [4, 4],
    labelText: node.title,
    labelFill: dark ? '#fca5a5' : '#ef4444',
    opacity: 0.8,
  };
}
```

- [ ] **Step 4: Verify TypeScript and existing tests**

Run: `npx tsc -b --noEmit && npx vitest run`
Expected: Zero TS errors, all existing tests pass

- [ ] **Step 5: Commit**

```bash
git add src/presentation/components/ZenMode/ZenMode.tsx \
        src/presentation/components/ZenMode/ZenChatView.tsx \
        src/presentation/components/ZenMode/GraphCanvas.tsx \
        src/domain/graph-engine/GraphEngine.ts
git commit -m "feat: redesign Zen mode with left-canvas + right-chat, orphan styling, progressive AI reveal"
```

---

### Phase 6: Mode Transition Animation

### Task 11: Smooth chat panel slide between left and right positions

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update App.tsx with layout animation**

```typescript
// src/App.tsx

import { AnimatePresence, motion } from 'motion/react';
import { AhaMode } from '@presentation/components/AhaMode/AhaMode';
import { ZenMode } from '@presentation/components/ZenMode/ZenMode';
import { ModeSwitch } from '@presentation/components/common/ModeSwitch';
import { AISettingsModal } from '@presentation/components/Settings/AISettingsModal';
import { useAppStore } from '@presentation/stores/appStore';
import { useThemeEffect } from '@presentation/stores/themeStore';

function App() {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const isAISettingsOpen = useAppStore((s) => s.isAISettingsOpen);

  useThemeEffect();

  return (
    <div data-mode={mode} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <ModeSwitch mode={mode} onSwitch={setMode} />
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          style={{ width: '100%', height: '100%' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        >
          {mode === 'aha' ? <AhaMode /> : <ZenMode />}
        </motion.div>
      </AnimatePresence>
      <AISettingsModal
        isOpen={isAISettingsOpen}
        onClose={useAppStore.getState().closeAISettings}
      />
    </div>
  );
}

export default App;
```

- [ ] **Step 2: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add mode transition animation with layout-aware panels"
```

---

### Phase 7: Final Wiring & Smoke Test

### Task 12: Final integration verification

No new files. Just validate everything works together.

- [ ] **Step 1: Run all Vitest tests**

Run: `cd e:/AHA/AHA && npx vitest run`
Expected: All tests PASS (existing 71 + new IdeaSplitter + new GraphEngine tests)

- [ ] **Step 2: Run TypeScript check**

Run: `cd e:/AHA/AHA && npx tsc -b --noEmit`
Expected: Zero errors

- [ ] **Step 3: Build frontend**

Run: `cd e:/AHA/AHA && npm run build`
Expected: Build succeeds

- [ ] **Step 4: Run E2E smoke test**

Run: `cd e:/AHA/AHA && npx playwright test --project=chromium`
Expected: 4 tests PASS

- [ ] **Step 5: Run `cargo tauri build` to verify bundling**

Run: `cd e:/AHA/AHA && npx tauri build`
Expected: Produces .exe + .msi + .nsis without errors

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: final integration verification — all tests pass, build succeeds"
```

---

## Dependency Graph

```
Phase 1: IdeaSplitter ─────────────────────────────────────────┐
Phase 2: AIService + chatStore + detectOrphanNodes ────────────┤
    Task 2 (AIService) ─── Task 5 (wire splitter)              │
    Task 3 (chatStore)     Task 4 (detectOrphanNodes)          │
                     │                                          │
Phase 3: ChatView + useAIChat ← depends on Phase 2             │
                     │                                          │
Phase 4: Aha Mode ← depends on Phase 1,2,3                     │
Phase 5: Zen Mode ← depends on Phase 1,2,3                     │
Phase 6: Transition ← depends on Phase 4,5                     │
Phase 7: Final verify ← depends on everything                  │
```
