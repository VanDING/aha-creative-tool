/**
 * Aha Mode — Bottom-fixed quick input bar.
 */

import { useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppStore } from '@presentation/stores/appStore';
import { useChatStore } from '@presentation/stores/chatStore';
import { applicationService } from '@application/services/ApplicationService';
import { useAIChat } from '@presentation/hooks/useAIChat';
import { AIService } from '@application/services/AIService';

export interface QuickInputProps {
  onSubmit?: (content: string) => void;
}

export function QuickInput({ onSubmit }: QuickInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ahaInputBuffer = useAppStore((state) => state.ahaInputBuffer);
  const setAhaInputBuffer = useAppStore((state) => state.setAhaInputBuffer);
  const addNode = useAppStore((state) => state.addNode);
  const projectPath = useAppStore((state) => state.currentProjectPath);
  const { send } = useAIChat();

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
    const ai = AIService.getInstance();
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
                aiSuggestions: [...currentState.graphData.aiSuggestions, ...aiSuggestions],
              },
            });
          }
        });
      }
    }

    // Auto-generate AI response to the new thoughts
    void send(raw, 'aha-ai');

    onSubmit?.(raw);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAhaInputBuffer(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  return (
    <motion.div
      className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-40"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div
        className="flex items-end gap-2 p-3 rounded-2xl shadow-xl"
        style={{
          backgroundColor: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={ahaInputBuffer}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
          className="flex-1 max-h-40 px-3 py-2 bg-transparent outline-none resize-none text-base"
          style={{ color: 'var(--text)' }}
          placeholder="写下任何想法… 按 Enter 发送，Shift+Enter 换行"
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!ahaInputBuffer.trim()}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: 'var(--accent)',
            color: '#fff',
          }}
        >
          <Sparkles size={16} />
          记录
        </button>
      </div>
      {ahaInputBuffer.trim().length > 0 && (
        <div className="mt-2 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          按 Enter 快速记录，Shift + Enter 换行
        </div>
      )}
    </motion.div>
  );
}
