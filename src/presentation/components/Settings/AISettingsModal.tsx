/**
 * AI Settings Modal
 */

import { X, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAISettingsStore } from '@presentation/stores/aiSettingsStore';
import { ProviderEditor } from './ProviderEditor';
import { ProviderList } from './ProviderList';

export interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AISettingsModal({ isOpen, onClose }: AISettingsModalProps) {
  const providers = useAISettingsStore((state) => state.providers);
  const addProvider = useAISettingsStore((state) => state.addProvider);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-2xl max-h-[80vh] overflow-auto rounded-2xl p-6 shadow-2xl"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2
                  className="text-xl font-semibold flex items-center gap-2"
                  style={{ color: 'var(--text)' }}
                >
                  <Zap size={20} />
                  AI 供应商设置
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                  AHA 是插座，你决定插什么电器
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-md transition-colors hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            <ProviderList />

            <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
              <ProviderEditor
                onSave={(provider) => {
                  addProvider(provider);
                }}
              />
            </div>

            {providers.length === 0 && (
              <div
                className="mt-6 text-center py-8 rounded-xl"
                style={{
                  backgroundColor: 'var(--color-aha-ai-light)',
                  color: 'var(--color-aha-ai)',
                }}
              >
                <p className="text-sm">还没有配置任何 AI 供应商</p>
                <p className="text-xs mt-1 opacity-80">点击下方按钮添加你的第一个供应商</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
