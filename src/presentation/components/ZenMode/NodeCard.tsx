/**
 * Zen Mode — Floating node detail card.
 */

import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@presentation/stores/appStore';

export function NodeCard() {
  const selectedNodeId = useAppStore((state) => state.selectedNodeId);
  const graphData = useAppStore((state) => state.graphData);
  const selectNode = useAppStore((state) => state.selectNode);

  const node = selectedNodeId ? graphData.nodes.find((n) => n.id === selectedNodeId) : null;

  return (
    <AnimatePresence>
      {node && (
        <motion.div
          className="fixed top-20 right-6 z-50 w-80 max-h-[60vh] overflow-auto rounded-2xl shadow-2xl p-5"
          style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.25 }}
        >
          <div className="flex items-start justify-between mb-3">
            <h3 className="text-lg font-semibold pr-4" style={{ color: 'var(--text)' }}>
              {node.title}
            </h3>
            <button
              type="button"
              onClick={() => selectNode(null)}
              className="p-1 rounded-md transition-colors hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
              title="关闭"
            >
              <X size={18} />
            </button>
          </div>

          <div
            className="text-sm whitespace-pre-wrap leading-relaxed"
            style={{ color: 'var(--text)' }}
          >
            {node.content || <span style={{ color: 'var(--text-muted)' }}>暂无内容</span>}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {node.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full text-xs"
                style={{
                  backgroundColor: 'var(--color-aha-ai-light)',
                  color: 'var(--color-aha-ai)',
                }}
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            创建于 {new Date(node.createdAt).toLocaleString()}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
