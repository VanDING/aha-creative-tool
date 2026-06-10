import { motion } from 'motion/react';
import { GraphCanvas } from './GraphCanvas';
import { GraphToolbar } from './GraphToolbar';
import { NodeCard } from './NodeCard';
import { UndoRedoButtons } from './UndoRedoButtons';

export function ZenMode() {
  return (
    <motion.div
      className="relative w-full h-full overflow-hidden"
      style={{ backgroundColor: 'var(--bg)' }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      <GraphToolbar />
      <GraphCanvas />
      <NodeCard />
      <UndoRedoButtons />
    </motion.div>
  );
}
