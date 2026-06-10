import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { GraphCanvas } from './GraphCanvas';
import { GraphToolbar } from './GraphToolbar';
import { GraphControllerProvider } from './GraphControllerContext';
import { NodeCard } from './NodeCard';
import { UndoRedoButtons } from './UndoRedoButtons';
import { ExtensionPanel } from './ExtensionPanel';
import { ContextMenu } from './ContextMenu';
import { SearchPanel } from './SearchPanel';
import { ExportDialog } from '../ExportDialog/ExportDialog';
import { SummaryModal } from '../SummaryModal/SummaryModal';
import { useAppStore } from '@presentation/stores/appStore';
import { useKeyboardShortcuts } from '@presentation/hooks/useKeyboardShortcuts';
import type { AIGatewayLike } from '@domain/ai-engine/AIEngine';

// Placeholder gateway until a real one is wired in App
const placeholderGateway: AIGatewayLike = {
  async *streamGenerate() {
    yield { type: 'done' };
  },
  async generateStructured() {
    return {} as never;
  },
};

export function ZenMode() {
  const isSearchOpen = useAppStore((state) => state.isSearchOpen);
  const isExportOpen = useAppStore((state) => state.isExportOpen);
  const isSummaryOpen = useAppStore((state) => state.isSummaryOpen);
  const closeSummary = useAppStore((state) => state.closeSummary);

  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    x: number;
    y: number;
  } | null>(null);

  const handleNodeContextMenu = useCallback((nodeId: string, x: number, y: number) => {
    setContextMenu({ nodeId, x, y });
  }, []);

  useKeyboardShortcuts();

  return (
    <motion.div
      className="relative w-full h-full overflow-hidden"
      style={{ backgroundColor: 'var(--bg)' }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onClick={() => setContextMenu(null)}
    >
      <GraphControllerProvider>
        <GraphToolbar />
        <GraphCanvas onNodeContextMenu={handleNodeContextMenu} />
      </GraphControllerProvider>
      <NodeCard />
      <ExtensionPanel gateway={placeholderGateway} />
      <UndoRedoButtons />
      <SearchPanel isOpen={isSearchOpen} onClose={useAppStore.getState().closeSearch} />
      <ExportDialog isOpen={isExportOpen} onClose={useAppStore.getState().closeExport} />
      <SummaryModal isOpen={isSummaryOpen} onClose={closeSummary} />

      {contextMenu && (
        <div
          className="absolute"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <ContextMenu nodeId={contextMenu.nodeId} onClose={() => setContextMenu(null)} />
        </div>
      )}
    </motion.div>
  );
}
