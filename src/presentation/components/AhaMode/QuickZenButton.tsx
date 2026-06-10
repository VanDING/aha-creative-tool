/**
 * Aha Mode — Quick Zen entry button.
 */

import { Orbit } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppStore } from '@presentation/stores/appStore';

export function QuickZenButton() {
  const nodeCount = useAppStore((state) => state.graphData.nodes.length);
  const setMode = useAppStore((state) => state.setMode);

  if (nodeCount === 0) return null;

  return (
    <motion.button
      type="button"
      onClick={() => setMode('zen')}
      className="fixed bottom-8 right-8 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium"
      style={{
        backgroundColor: 'var(--color-aha-zen-bg)',
        color: 'var(--color-aha-zen-text)',
        border: '1px solid var(--color-aha-zen-accent)',
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Orbit size={18} />
      即时 Zen
      <span
        className="ml-1 px-1.5 py-0.5 rounded-full text-xs"
        style={{
          backgroundColor: 'var(--color-aha-zen-accent)',
          color: 'var(--color-aha-zen-bg)',
        }}
      >
        {nodeCount}
      </span>
    </motion.button>
  );
}
