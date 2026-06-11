import { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@presentation/stores/appStore';
import { detectOrphanNodes } from '@domain/graph-engine/GraphEngine';

export function CardFlow() {
  const graphData = useAppStore((s) => s.graphData);
  const selectNode = useAppStore((s) => s.selectNode);

  const nodes = useMemo(
    () => graphData.nodes.filter((n) => n.status !== 'archived'),
    [graphData.nodes],
  );

  const orphanIds = useMemo(
    () => new Set(detectOrphanNodes(graphData)),
    [graphData],
  );

  return (
    <div className="flex flex-col h-full">
      <div
        className="px-4 py-3 text-xs font-medium border-b"
        style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
      >
        想法节点 · {nodes.length}
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        <AnimatePresence>
          {[...nodes].reverse().map((node) => (
            <motion.div
              key={node.id}
              className="px-3 py-2.5 rounded-xl cursor-pointer transition-shadow hover:shadow-md"
              style={{
                backgroundColor: 'var(--surface)',
                border: orphanIds.has(node.id)
                  ? '1px dashed #f87171'
                  : '1px solid var(--border)',
              }}
              initial={{ opacity: 0, x: 20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              onClick={() => selectNode(node.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className="text-sm font-medium truncate flex-1"
                  style={{ color: 'var(--text)' }}
                >
                  {node.title}
                </p>
                {node.status === 'main-branch' && (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#22c55e20', color: '#22c55e' }}>
                    主干
                  </span>
                )}
                {orphanIds.has(node.id) && (
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#f8717120', color: '#f87171' }}>
                    游离
                  </span>
                )}
              </div>
              {node.content !== node.title && (
                <p
                  className="text-xs mt-1 line-clamp-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {node.content.slice(0, 120)}
                </p>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {nodes.length === 0 && (
          <div className="text-center text-sm mt-16" style={{ color: 'var(--text-muted)' }}>
            还没有节点，在左侧对话中输入你的想法
          </div>
        )}
      </div>
    </div>
  );
}
