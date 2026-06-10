import { motion } from 'motion/react';

export function ZenMode() {
  return (
    <motion.div
      className="flex items-center justify-center w-full h-full"
      style={{ backgroundColor: 'var(--bg)' }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="text-center">
        <p style={{ color: 'var(--text-muted)' }}>
          脉络图将在此呈现
        </p>
      </div>
    </motion.div>
  );
}
