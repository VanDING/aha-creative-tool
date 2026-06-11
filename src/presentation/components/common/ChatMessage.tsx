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
      <div className="flex justify-center py-3">
        <span
          className="text-[11px] tracking-wide px-3 py-1 rounded-full"
          style={{
            color: 'var(--text-muted)',
            backgroundColor: 'var(--surface-elevated)',
          }}
        >
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      className={`flex gap-3 mb-5 ${isUser ? 'justify-end' : 'justify-start'}`}
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {!isUser && (
        <div
          className="w-7 h-7 rounded-lg flex-shrink-0 mt-0.5 text-xs font-semibold flex items-center justify-center text-white shadow-sm"
          style={{ backgroundColor: personaColor }}
        >
          {personaName[0]}
        </div>
      )}
      <div
        className={`max-w-[78%] px-4 py-2.5 text-sm leading-relaxed ${isUser ? 'text-white' : ''}`}
        style={
          isUser
            ? {
                backgroundColor: 'var(--accent)',
                borderRadius: '16px 16px 4px 16px',
              }
            : {
                backgroundColor: 'var(--surface)',
                borderRadius: '16px 16px 16px 4px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                color: 'var(--text)',
              }
        }
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>
      {isUser && (
        <div
          className="w-7 h-7 rounded-lg flex-shrink-0 mt-0.5 text-xs font-semibold flex items-center justify-center text-white shadow-sm"
          style={{ backgroundColor: 'var(--text-muted)' }}
        >
          U
        </div>
      )}
    </motion.div>
  );
}
