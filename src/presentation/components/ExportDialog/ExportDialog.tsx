/**
 * Export Dialog — Preview and confirm delivery package export.
 */

import { useState } from 'react';
import { X, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '@presentation/stores/appStore';
import { applicationService } from '@application/services/ApplicationService';

export interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const graphData = useAppStore((state) => state.graphData);
  const projectPath = useAppStore((state) => state.currentProjectPath);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [preview, setPreview] = useState<{
    projectContext: string;
    developmentPack: string;
  } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handlePreview = async () => {
    if (!selectedBranchId) return;
    setIsExporting(true);
    try {
      const result = await applicationService.exportDeliveryPackage(
        selectedBranchId,
        projectPath,
        graphData,
      );
      setPreview(result);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClose = () => {
    setSelectedBranchId('');
    setPreview(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="w-full max-w-3xl max-h-[80vh] overflow-auto rounded-2xl p-6 shadow-2xl"
            style={{
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
            }}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
                导出实施构建包
              </h2>
              <button
                type="button"
                onClick={handleClose}
                className="p-1 rounded-md hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {!preview ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                    选择要导出的主干方案
                  </label>
                  {graphData.mainBranches.length === 0 ? (
                    <div
                      className="p-4 rounded-xl text-sm"
                      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-muted)' }}
                    >
                      尚未标记任何主干方案。请在 Zen 模式下右键节点选择「标记为主干」。
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {graphData.mainBranches.map((branch) => (
                        <label
                          key={branch.id}
                          className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
                          style={{ backgroundColor: 'var(--bg)' }}
                        >
                          <input
                            type="radio"
                            name="branch"
                            value={branch.id}
                            checked={selectedBranchId === branch.id}
                            onChange={(e) => setSelectedBranchId(e.target.value)}
                          />
                          <div>
                            <div style={{ color: 'var(--text)' }}>{branch.name}</div>
                            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {branch.nodeIds.length} 个节点
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => void handlePreview()}
                  disabled={!selectedBranchId || isExporting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-40"
                  style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                >
                  <Download size={16} />
                  {isExporting ? '生成中…' : '预览并导出'}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                      PROJECT_CONTEXT.md
                    </h3>
                    <pre
                      className="text-xs p-3 rounded-xl overflow-auto max-h-64 whitespace-pre-wrap"
                      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
                    >
                      {preview.projectContext}
                    </pre>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                      DEVELOPMENT_PACK.md
                    </h3>
                    <pre
                      className="text-xs p-3 rounded-xl overflow-auto max-h-64 whitespace-pre-wrap"
                      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
                    >
                      {preview.developmentPack}
                    </pre>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
                >
                  完成
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
