/**
 * Zen Mode — Floating search panel for finding nodes.
 */

import { useState, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@presentation/stores/appStore';

export interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchPanel({ isOpen, onClose }: SearchPanelProps) {
  const nodes = useAppStore((state) => state.graphData.nodes);
  const selectNode = useAppStore((state) => state.selectNode);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return nodes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [query, nodes]);

  const handleSelect = (id: string) => {
    selectNode(id);
    onClose();
    setQuery('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <div
            className="rounded-2xl shadow-2xl p-3"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center gap-2">
              <Search size={18} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索节点标题、内容或标签…"
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: 'var(--text)' }}
                autoFocus
              />
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {results.length > 0 && (
              <div className="mt-2 max-h-60 overflow-auto space-y-1">
                {results.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => handleSelect(node.id)}
                    className="w-full text-left px-3 py-2 rounded-xl text-sm transition-colors hover:opacity-80"
                    style={{ backgroundColor: 'var(--bg)' }}
                  >
                    <div style={{ color: 'var(--text)' }}>{node.title}</div>
                    <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                      {node.content || '无内容'}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {query.trim() && results.length === 0 && (
              <div className="mt-2 text-center text-xs py-2" style={{ color: 'var(--text-muted)' }}>
                未找到匹配节点
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
