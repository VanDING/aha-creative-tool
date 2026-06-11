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
