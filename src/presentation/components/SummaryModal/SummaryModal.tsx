/**
 * Summary Modal — Show journey review and naming ceremony.
 */

import { useState, useEffect } from 'react';
import { X, Sparkles, Check, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@presentation/stores/appStore';
import { summaryGenerator } from '@domain/summary-generator/SummaryGenerator';
import type { SummaryData } from '@domain/summary-generator/SummaryGenerator';

export interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SummaryModal({ isOpen, onClose }: SummaryModalProps) {
  const graphData = useAppStore((state) => state.graphData);
  const currentProjectPath = useAppStore((state) => state.currentProjectPath);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [customName, setCustomName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSummary(null);
      return;
    }
    const projectName = currentProjectPath?.split('/').pop() || '未命名项目';
    const data = summaryGenerator.generate({
      projectName,
      graphData,
      sessionStartedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      sessionEndedAt: new Date().toISOString(),
    });
    setSummary(data);
    setCustomName(data.suggestedName);
  }, [isOpen, graphData, currentProjectPath]);

  return (
    <AnimatePresence>
      {isOpen && summary && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-lg rounded-3xl shadow-2xl p-8 text-center"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-aha-ai-light)' }}
              >
                <Sparkles size={28} style={{ color: 'var(--color-aha-ai)' }} />
              </div>
            </div>

            <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text)' }}>
              {summary.title}
            </h2>

            <p
              className="text-base leading-relaxed whitespace-pre-line mb-6"
              style={{ color: 'var(--text-muted)' }}
            >
              {summary.journey}
            </p>

            <div className="rounded-2xl p-4 mb-6" style={{ backgroundColor: 'var(--bg)' }}>
              <div
                className="text-xs uppercase tracking-wide mb-2"
                style={{ color: 'var(--text-muted)' }}
              >
                命名仪式
              </div>
              {!isEditing ? (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xl font-medium" style={{ color: 'var(--text)' }}>
                    {customName || summary.suggestedName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="p-1 rounded-md hover:opacity-70"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <Edit3 size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="px-3 py-1 rounded-lg text-center bg-transparent outline-none"
                    style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="p-1 rounded-md"
                    style={{ color: '#22c55e' }}
                  >
                    <Check size={18} />
                  </button>
                </div>
              )}
            </div>

            <div className="mb-6 text-left">
              <div
                className="text-xs uppercase tracking-wide mb-2"
                style={{ color: 'var(--text-muted)' }}
              >
                交付物清单
              </div>
              <ul className="space-y-1">
                {summary.deliverables.map((item, idx) => (
                  <li
                    key={idx}
                    className="text-sm px-3 py-2 rounded-xl"
                    style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
                  >
                    {idx + 1}. {item}
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-3 rounded-xl text-sm font-medium"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              完成回顾
            </button>

            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:opacity-70"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={20} />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
