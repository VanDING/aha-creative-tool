/**
 * Aha Mode — Bottom-fixed quick input bar.
 */

import { useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppStore } from '@presentation/stores/appStore';
import { createNode } from '@domain/graph-engine/GraphEngine';

export interface QuickInputProps {
  onSubmit?: (content: string) => void;
}

export function QuickInput({ onSubmit }: QuickInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ahaInputBuffer = useAppStore((state) => state.ahaInputBuffer);
  const setAhaInputBuffer = useAppStore((state) => state.setAhaInputBuffer);
  const addNode = useAppStore((state) => state.addNode);

  const handleSubmit = () => {
    const raw = ahaInputBuffer.trim();
    if (!raw) return;

    const title = raw.split('\n')[0].slice(0, 60);
    const node = createNode(title, raw);
    addNode(node);
    onSubmit?.(raw);
    setAhaInputBuffer('');
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
          onClick={handleSubmit}
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
