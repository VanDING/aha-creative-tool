/**
 * Aha Mode — Recent node stack preview.
 */

import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@presentation/stores/appStore';

export function NodeStack() {
  const graphData = useAppStore((state) => state.graphData);
  const recentNodeIds = useAppStore((state) => state.recentNodeIds);

  const recentNodes = recentNodeIds
    .map((id) => graphData.nodes.find((n) => n.id === id))
    .filter(Boolean)
    .slice(0, 5);

  if (recentNodes.length === 0) return null;

  return (
    <div className="w-full max-w-2xl px-4 mt-8">
      <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
        最近记录
      </h4>
      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {recentNodes.map((node) => (
            <motion.div
              key={node!.id}
              className="px-4 py-3 rounded-xl text-sm"
              style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
              }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              layout
            >
              <div className="font-medium mb-1">{node!.title}</div>
              <div className="line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                {node!.content || '无内容'}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
