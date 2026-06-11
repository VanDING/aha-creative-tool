import { useRef, useEffect, useState } from 'react';
import { Send, Square } from 'lucide-react';
import { ChatMessageBubble } from './ChatMessage';
import { useChatStore } from '@presentation/stores/chatStore';
import type { AIPersona } from '@presentation/stores/chatStore';

export interface ChatViewProps {
  persona: AIPersona;
  personaColor: string;
  personaName: string;
  onSend: (content: string) => void;
  onCancel: () => void;
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
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
        className="flex items-center gap-3 px-5 py-3.5 shrink-0"
        style={{ backgroundColor: 'var(--surface-elevated)' }}
      >
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: personaColor }}
        />
        <span className="text-sm font-semibold tracking-tight">{personaName}</span>
        {isStreaming && (
          <span className="ml-auto text-[11px] font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>
            正在思考…
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div
              className="w-12 h-12 rounded-2xl mb-4 flex items-center justify-center text-lg font-bold text-white"
              style={{ backgroundColor: personaColor, opacity: 0.9 }}
            >
              {personaName[0]}
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              {persona === 'aha-ai'
                ? '倾倒你的想法，AI 会帮你发散和联想'
                : '选择节点进行深度分析，或直接讨论整体脉络'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
              {persona === 'aha-ai'
                ? '输入任何想法，按 Enter 发送'
                : '在右侧画布中点击节点以聚焦分析'}
            </p>
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

      {/* Context label */}
      {contextLabel && (
        <div
          className="px-5 py-2 text-[11px] font-medium tracking-wide shrink-0"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            color: 'var(--text-muted)',
          }}
        >
          分析对象：{contextLabel}
        </div>
      )}

      {/* Input */}
      <div className="px-5 py-4 shrink-0" style={{ backgroundColor: 'var(--surface-elevated)' }}>
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={persona === 'aha-ai' ? '继续说你的想法…' : '深度分析…'}
            className="w-full px-4 py-3 pr-12 bg-transparent outline-none resize-none text-sm rounded-xl"
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
              maxHeight: '120px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          />
          {/* Inspiration pulse line — signature element */}
          <div
            className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full inspiration-pulse pointer-events-none"
            style={{
              background: `linear-gradient(90deg, transparent, ${personaColor}, transparent)`,
              opacity: input.trim() ? 0.6 : 0.2,
            }}
          />
          <div className="absolute right-3 bottom-3">
            {isStreaming ? (
              <button
                onClick={onCancel}
                className="p-2 rounded-lg transition-all hover:scale-105"
                style={{ backgroundColor: 'var(--surface)', color: 'var(--text-muted)' }}
              >
                <Square size={14} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!input.trim()}
                className="p-2 rounded-lg transition-all hover:scale-105 disabled:opacity-30 disabled:hover:scale-100"
                style={{ backgroundColor: personaColor, color: '#fff' }}
              >
                <Send size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
