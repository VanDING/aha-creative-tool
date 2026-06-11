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
