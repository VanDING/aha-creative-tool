/**
 * Zen Mode — Node context menu for pruning and other actions.
 */

import { useState } from 'react';
import { Scissors, Flag, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@presentation/stores/appStore';
import { applicationService } from '@application/services/ApplicationService';

export interface ContextMenuProps {
  nodeId: string;
  onClose: () => void;
}

export function ContextMenu({ nodeId, onClose }: ContextMenuProps) {
  const projectPath = useAppStore((state) => state.currentProjectPath);
  const archiveNode = useAppStore((state) => state.archiveNode);
  const markMainBranch = useAppStore((state) => state.markMainBranch);
  const [showPruneReason, setShowPruneReason] = useState(false);
  const [reason, setReason] = useState('');
  const [showMarkName, setShowMarkName] = useState(false);
  const [name, setName] = useState('');

  const handlePrune = async () => {
    if (!reason.trim()) return;
    await applicationService.handlePruning(nodeId, reason, projectPath);
    archiveNode(nodeId, reason);
    setShowPruneReason(false);
    onClose();
  };

  const handleMark = async () => {
    if (!name.trim()) return;
    await applicationService.handleMarkMainBranch(nodeId, name, projectPath);
    markMainBranch(nodeId, name);
    setShowMarkName(false);
    onClose();
  };

  return (
    <motion.div
      className="absolute z-50 w-48 rounded-xl shadow-xl overflow-hidden"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <AnimatePresence mode="wait">
        {showPruneReason ? (
          <motion.div
            key="prune"
            className="p-3 space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>
              修剪原因（必填）
            </div>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-2 py-1 rounded text-xs bg-transparent outline-none resize-none"
              style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
              rows={2}
              placeholder="为什么修剪这个分支？"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrune}
                disabled={!reason.trim()}
                className="flex-1 px-2 py-1 rounded text-xs font-medium disabled:opacity-40"
                style={{ backgroundColor: '#ef4444', color: '#fff' }}
              >
                确认修剪
              </button>
              <button
                type="button"
                onClick={() => setShowPruneReason(false)}
                className="flex-1 px-2 py-1 rounded text-xs"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
              >
                取消
              </button>
            </div>
          </motion.div>
        ) : showMarkName ? (
          <motion.div
            key="mark"
            className="p-3 space-y-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-xs font-medium" style={{ color: 'var(--text)' }}>
              主干方案名称
            </div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2 py-1 rounded text-xs bg-transparent outline-none"
              style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
              placeholder="例如：情感主线方案"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleMark}
                disabled={!name.trim()}
                className="flex-1 px-2 py-1 rounded text-xs font-medium disabled:opacity-40"
                style={{ backgroundColor: '#22c55e', color: '#fff' }}
              >
                确认标记
              </button>
              <button
                type="button"
                onClick={() => setShowMarkName(false)}
                className="flex-1 px-2 py-1 rounded text-xs"
                style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
              >
                取消
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              onClick={() => setShowMarkName(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:opacity-80 transition-colors"
              style={{ color: 'var(--text)' }}
            >
              <Flag size={14} style={{ color: '#22c55e' }} />
              标记为主干
            </button>
            <button
              type="button"
              onClick={() => setShowPruneReason(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:opacity-80 transition-colors"
              style={{ color: 'var(--text)' }}
            >
              <Scissors size={14} style={{ color: '#ef4444' }} />
              修剪此分支
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:opacity-80 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={14} />
              取消
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
