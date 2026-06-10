/**
 * Zen Mode — Undo / Redo floating buttons.
 */

import { Undo2, Redo2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppStore, useTemporalStore } from '@presentation/stores/appStore';

export function UndoRedoButtons() {
  const temporal = useTemporalStore();
  const canUndo = useAppStore.temporal.getState().pastStates.length > 0;
  const canRedo = useAppStore.temporal.getState().futureStates.length > 0;

  return (
    <motion.div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 rounded-full shadow-lg"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <ControlButton
        icon={<Undo2 size={18} />}
        label="撤销"
        disabled={!canUndo}
        onClick={() => temporal.getState().undo()}
      />
      <div className="w-px h-5" style={{ backgroundColor: 'var(--border)' }} />
      <ControlButton
        icon={<Redo2 size={18} />}
        label="重做"
        disabled={!canRedo}
        onClick={() => temporal.getState().redo()}
      />
    </motion.div>
  );
}

function ControlButton({
  icon,
  label,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
      style={{ color: 'var(--text)' }}
      title={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
