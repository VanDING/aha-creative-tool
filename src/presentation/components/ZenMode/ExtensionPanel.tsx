/**
 * Zen Mode — AI Extension streaming panel.
 */

import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, GitBranch } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@presentation/stores/appStore';
import { applicationService } from '@application/services/ApplicationService';
import type { AIGatewayLike } from '@domain/ai-engine/AIEngine';
import { AIEngine } from '@domain/ai-engine/AIEngine';
import { MemorySystem } from '@domain/memory-system/MemorySystem';

export interface ExtensionPanelProps {
  gateway: AIGatewayLike;
}

export function ExtensionPanel({ gateway }: ExtensionPanelProps) {
  const selectedNodeId = useAppStore((state) => state.selectedNodeId);
  const graphData = useAppStore((state) => state.graphData);
  const projectPath = useAppStore((state) => state.currentProjectPath);
  const addNode = useAppStore((state) => state.addNode);
  const addEdge = useAppStore((state) => state.addEdge);
  const selectNode = useAppStore((state) => state.selectNode);

  const [isOpen, setIsOpen] = useState(false);
  const [directions, setDirections] = useState<Record<string, string>>({});
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!selectedNodeId) {
      setIsOpen(false);
      setDirections({});
      setCurrentTitle(null);
    }
  }, [selectedNodeId]);

  const handleExtend = async () => {
    if (!selectedNodeId || isStreaming) return;

    setIsOpen(true);
    setDirections({});
    setCurrentTitle(null);
    setIsStreaming(true);

    const abort = new AbortController();
    abortRef.current = abort;

    const memory = new MemorySystem();
    const l2 = memory.buildL2Context(graphData, selectedNodeId);
    const engine = new AIEngine({ gateway });

    try {
      for await (const chunk of engine.generateExtensions(
        memory.getCoreMemory(),
        l2,
        abort.signal,
      )) {
        if (chunk.type === 'direction' && chunk.title) {
          const title = chunk.title;
          setCurrentTitle(title);
          setDirections((prev) => ({ ...prev, [title]: '' }));
        } else if (chunk.type === 'content' && chunk.directionId && chunk.content) {
          const directionId = chunk.directionId;
          setDirections((prev) => ({
            ...prev,
            [directionId]: (prev[directionId] ?? '') + chunk.content,
          }));
        }
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const handleConfirm = async (title: string, content: string) => {
    if (!selectedNodeId) return;
    const fullContent = `### ${title}\n\n${content}`;
    const { node } = await applicationService.handleBranchConfirmation(
      selectedNodeId,
      fullContent,
      projectPath,
    );
    addNode(node);
    addEdge(selectedNodeId, node.id, 'user-confirmed');
    selectNode(node.id);
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setIsOpen(false);
    setDirections({});
    setCurrentTitle(null);
  };

  if (!selectedNodeId) return null;

  return (
    <div className="fixed bottom-24 right-6 z-50 flex flex-col items-end gap-2">
      {!isOpen && (
        <motion.button
          type="button"
          onClick={handleExtend}
          disabled={isStreaming}
          className="flex items-center gap-2 px-4 py-2 rounded-full shadow-lg text-sm font-medium disabled:opacity-50"
          style={{
            backgroundColor: 'var(--color-aha-ai)',
            color: '#fff',
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Sparkles size={16} />
          延展
        </motion.button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="w-80 max-h-[60vh] overflow-auto rounded-2xl shadow-2xl p-4"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h4
                className="font-semibold flex items-center gap-2"
                style={{ color: 'var(--text)' }}
              >
                <Sparkles size={16} style={{ color: 'var(--color-aha-ai)' }} />
                AI 延展
              </h4>
              <button
                type="button"
                onClick={handleCancel}
                className="p-1 rounded-md hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            {isStreaming && Object.keys(directions).length === 0 && (
              <div className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>
                思考中…
              </div>
            )}

            <div className="space-y-3">
              {Object.entries(directions).map(([title, content]) => (
                <div
                  key={title}
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: 'var(--bg)' }}
                >
                  <div className="font-medium text-sm mb-1" style={{ color: 'var(--text)' }}>
                    {title}
                  </div>
                  <div
                    className="text-sm whitespace-pre-wrap"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {content || '…'}
                  </div>
                  {!isStreaming && content.trim() && (
                    <button
                      type="button"
                      onClick={() => void handleConfirm(title, content)}
                      className="mt-2 flex items-center gap-1 text-xs px-2 py-1 rounded-md"
                      style={{
                        backgroundColor: 'var(--color-aha-confirmed)',
                        color: '#fff',
                      }}
                    >
                      <GitBranch size={12} />
                      提取为固化分支
                    </button>
                  )}
                </div>
              ))}
              {currentTitle && !directions[currentTitle] && (
                <div
                  className="p-3 rounded-xl animate-pulse"
                  style={{ backgroundColor: 'var(--bg)' }}
                >
                  <div className="font-medium text-sm" style={{ color: 'var(--text-muted)' }}>
                    正在生成：{currentTitle}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
