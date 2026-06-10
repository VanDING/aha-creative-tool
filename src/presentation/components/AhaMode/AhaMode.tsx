import { motion } from 'motion/react';
import { QuickInput } from './QuickInput';
import { NodeStack } from './NodeStack';
import { QuickZenButton } from './QuickZenButton';

export function AhaMode() {
  return (
    <motion.div
      className="flex flex-col items-center w-full h-full pt-16 pb-32 overflow-y-auto"
      style={{ backgroundColor: 'var(--bg)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="text-center mb-8">
        <h1 className="text-4xl font-light mb-2" style={{ color: 'var(--text)' }}>
          AHA
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>倾倒你的想法，无需整理</p>
      </div>

      <NodeStack />
      <QuickInput />
      <QuickZenButton />
    </motion.div>
  );
}
