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
