/**
 * Mobile Quick Input — minimal bottom-bar for narrow viewports.
 */

import { useState, useRef } from 'react';
import { Send } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppStore } from '@presentation/stores/appStore';
import { applicationService } from '@application/services/ApplicationService';

export function MobileQuickInput() {
  const [value, setValue] = useState('');
  const projectPath = useAppStore((s) => s.currentProjectPath);
  const addNode = useAppStore((s) => s.addNode);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async () => {
    const raw = value.trim();
    if (!raw) return;
    const node = await applicationService.handleNewThought(raw, projectPath);
    addNode(node);
    setValue('');
    inputRef.current?.blur();
  };

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-50 px-3 py-3 border-t sm:hidden"
      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleSubmit();
          }}
          className="flex-1 min-w-0 px-4 py-3 rounded-full text-base bg-transparent outline-none"
          style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
          placeholder="记录想法…"
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!value.trim()}
          className="shrink-0 p-3 rounded-full transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          aria-label="记录"
        >
          <Send size={20} />
        </button>
      </div>
    </motion.div>
  );
}
