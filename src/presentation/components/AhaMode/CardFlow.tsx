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
        className="px-5 py-3 flex items-center justify-between shrink-0"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--text-muted)' }}>
          想法节点
        </span>
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-md"
          style={{
            backgroundColor: 'var(--surface)',
            color: 'var(--text-muted)',
          }}
        >
          {nodes.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        <AnimatePresence>
          {[...nodes].reverse().map((node) => {
            const isOrphan = orphanIds.has(node.id);
            return (
              <motion.div
                key={node.id}
                className={`group px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-sm ${
                  isOrphan ? 'orphan-breathe' : ''
                }`}
                style={{
                  backgroundColor: 'var(--surface)',
                  boxShadow: isOrphan
                    ? '0 0 0 1px var(--orphan), 0 1px 3px rgba(0,0,0,0.04)'
                    : '0 1px 3px rgba(0,0,0,0.04)',
                }}
                whileHover={{ y: -1 }}
                initial={{ opacity: 0, x: 16, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2 }}
                onClick={() => selectNode(node.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium truncate flex-1 leading-snug" style={{ color: 'var(--text)' }}>
                    {node.title}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {node.status === 'main-branch' && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                        style={{
                          backgroundColor: 'var(--confirmed)',
                          color: '#fff',
                          opacity: 0.9,
                        }}
                      >
                        主干
                      </span>
                    )}
                    {isOrphan && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                        style={{
                          backgroundColor: 'var(--orphan)',
                          color: '#fff',
                          opacity: 0.85,
                        }}
                      >
                        游离
                      </span>
                    )}
                  </div>
                </div>
                {node.content !== node.title && (
                  <p className="text-xs mt-1.5 line-clamp-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {node.content.slice(0, 120)}
                  </p>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
        {nodes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div
              className="w-10 h-10 rounded-xl mb-3 flex items-center justify-center"
              style={{
                backgroundColor: 'var(--surface-elevated)',
                color: 'var(--text-muted)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              还没有想法
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
              在左侧对话中输入你的想法
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
