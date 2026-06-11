import { useState, useCallback, useEffect, useRef } from 'react';
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
import { ZenChatView } from './ZenChatView';
import { useAppStore } from '@presentation/stores/appStore';
import { useKeyboardShortcuts } from '@presentation/hooks/useKeyboardShortcuts';
import { AIService } from '@application/services/AIService';
import type { AIGatewayLike } from '@domain/ai-engine/AIEngine';

/** Use the real AIService as gateway for ExtensionPanel */
const realGateway: AIGatewayLike = {
  async *streamGenerate(taskType, options) {
    const ai = AIService.getInstance();
    for await (const chunk of ai.gateway.streamGenerate(taskType, options)) {
      yield chunk;
    }
  },
  async generateStructured(taskType, options) {
    const ai = AIService.getInstance();
    return ai.gateway.generateStructured(taskType, options);
  },
};

export function ZenMode() {
  const isSearchOpen = useAppStore((s) => s.isSearchOpen);
  const isExportOpen = useAppStore((s) => s.isExportOpen);
  const isSummaryOpen = useAppStore((s) => s.isSummaryOpen);
  const closeSummary = useAppStore((s) => s.closeSummary);
  const graphData = useAppStore((s) => s.graphData);

  // Progressive AI edge reveal
  const [revealAISuggestions, setRevealAISuggestions] = useState(false);
  const hasRevealed = useRef(false);

  useEffect(() => {
    if (!hasRevealed.current && graphData.aiSuggestions.length > 0) {
      const timer = setTimeout(() => {
        setRevealAISuggestions(true);
        hasRevealed.current = true;
      }, 1500); // 1.5s delay after mount
      return () => clearTimeout(timer);
    }
  }, [graphData.aiSuggestions.length]);

  const visibleGraphData = revealAISuggestions
    ? graphData
    : { ...graphData, aiSuggestions: [] };

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
      className="flex w-full h-full overflow-hidden"
      style={{ backgroundColor: 'var(--bg)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => setContextMenu(null)}
    >
      {/* Left: Graph Canvas */}
      <motion.div
        className="h-full border-r relative overflow-hidden"
        style={{ width: '60%', borderColor: 'var(--border)' }}
        layout
      >
        <GraphControllerProvider>
          <GraphToolbar />
          <GraphCanvas onNodeContextMenu={handleNodeContextMenu} graphDataOverride={visibleGraphData} />
        </GraphControllerProvider>
        <NodeCard />
        <ExtensionPanel gateway={realGateway} />
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

      {/* Right: Chat */}
      <motion.div
        className="h-full"
        style={{ width: '40%' }}
        layout
      >
        <ZenChatView />
      </motion.div>
    </motion.div>
  );
}
