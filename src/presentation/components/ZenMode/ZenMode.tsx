import { useState, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import { GraphCanvas } from './GraphCanvas';
import { GraphToolbar } from './GraphToolbar';
import { NodeCard } from './NodeCard';
import { UndoRedoButtons } from './UndoRedoButtons';
import { ExtensionPanel } from './ExtensionPanel';
import { ContextMenu } from './ContextMenu';
import { SearchPanel } from './SearchPanel';
import { ExportDialog } from '../ExportDialog/ExportDialog';
import { useAppStore } from '@presentation/stores/appStore';
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
  const openSearch = useAppStore((state) => state.openSearch);
  const closeSearch = useAppStore((state) => state.closeSearch);
  const openExport = useAppStore((state) => state.openExport);
  const closeExport = useAppStore((state) => state.closeExport);

  const [contextMenu, setContextMenu] = useState<{
    nodeId: string;
    x: number;
    y: number;
  } | null>(null);

  const handleNodeContextMenu = useCallback((nodeId: string, x: number, y: number) => {
    setContextMenu({ nodeId, x, y });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        openSearch();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        openExport();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openSearch, openExport]);

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
      <GraphToolbar />
      <GraphCanvas onNodeContextMenu={handleNodeContextMenu} />
      <NodeCard />
      <ExtensionPanel gateway={placeholderGateway} />
      <UndoRedoButtons />
      <SearchPanel isOpen={isSearchOpen} onClose={closeSearch} />
      <ExportDialog isOpen={isExportOpen} onClose={closeExport} />

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
