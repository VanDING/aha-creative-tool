import { motion } from 'motion/react';

interface ModeSwitchProps {
  mode: 'aha' | 'zen';
  onSwitch: (mode: 'aha' | 'zen') => void;
}

export function ModeSwitch({ mode, onSwitch }: ModeSwitchProps) {
  const isAha = mode === 'aha';

  return (
    <motion.button
      className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl text-sm font-semibold tracking-tight transition-colors shadow-sm"
      style={{
        backgroundColor: 'var(--surface)',
        color: 'var(--text)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}
      onClick={() => onSwitch(isAha ? 'zen' : 'aha')}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <span className="flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: isAha ? '#C4884A' : '#6B9FBF' }}
        />
        {isAha ? 'Zen 模式' : 'Aha 模式'}
      </span>
    </motion.button>
  );
}
