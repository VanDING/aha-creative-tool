import { motion } from 'motion/react';

interface ModeSwitchProps {
  mode: 'aha' | 'zen';
  onSwitch: (mode: 'aha' | 'zen') => void;
}

export function ModeSwitch({ mode, onSwitch }: ModeSwitchProps) {
  const isAha = mode === 'aha';

  return (
    <motion.button
      className="fixed top-4 right-4 z-50 px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-md"
      style={{
        background: isAha ? 'var(--color-aha-zen-bg)' : 'var(--color-aha-bg)',
        color: isAha ? 'var(--color-aha-zen-text)' : 'var(--color-aha-text)',
        border: `1px solid ${isAha ? 'var(--color-aha-zen-accent)' : 'var(--color-aha-border)'}`,
      }}
      onClick={() => onSwitch(isAha ? 'zen' : 'aha')}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {isAha ? 'Zen 模式' : 'Aha 模式'}
    </motion.button>
  );
}
