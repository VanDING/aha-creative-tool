import { motion } from 'motion/react';

interface ModeSwitchProps {
  mode: 'aha' | 'zen';
  onSwitch: (mode: 'aha' | 'zen') => void;
}

export function ModeSwitch({ mode, onSwitch }: ModeSwitchProps) {
  return (
    <motion.button
      className="fixed top-4 right-4 z-50 px-4 py-2 rounded-full text-sm font-medium transition-colors"
      style={{
        background: mode === 'aha' ? 'var(--aha-zen-bg)' : 'var(--aha-bg)',
        color: mode === 'aha' ? 'var(--aha-zen-text)' : 'var(--aha-text)',
      }}
      onClick={() => onSwitch(mode === 'aha' ? 'zen' : 'aha')}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {mode === 'aha' ? 'Zen 模式' : 'Aha 模式'}
    </motion.button>
  );
}
