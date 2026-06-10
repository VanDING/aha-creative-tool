/**
 * Zen Mode — Floating toolbar for graph controls.
 */

import { ZoomIn, ZoomOut, Maximize, LayoutGrid, Sparkles, Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { useAppStore } from '@presentation/stores/appStore';
import { useThemeStore } from '@presentation/stores/themeStore';
import { useGraphController } from './GraphControllerContext';

export function GraphToolbar() {
  const activeLayout = useAppStore((state) => state.activeLayoutType);
  const setLayoutType = useAppStore((state) => state.setLayoutType);
  const openSearch = useAppStore((state) => state.openSearch);
  const openExport = useAppStore((state) => state.openExport);
  const openSummary = useAppStore((state) => state.openSummary);
  const { zoomIn, zoomOut, fitView } = useGraphController();
  const { resolved, toggle } = useThemeStore();

  return (
    <motion.div
      className="fixed top-4 left-4 z-40 flex items-center gap-2 px-3 py-2 rounded-xl shadow-lg"
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <ToolbarButton icon={<ZoomIn size={18} />} label="放大" onClick={() => zoomIn()} />
      <ToolbarButton icon={<ZoomOut size={18} />} label="缩小" onClick={() => zoomOut()} />
      <ToolbarButton icon={<Maximize size={18} />} label="自适应" onClick={() => fitView()} />
      <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--border)' }} />
      <LayoutSelector value={activeLayout} onChange={setLayoutType} />
      <div className="w-px h-5 mx-1" style={{ backgroundColor: 'var(--border)' }} />
      <ToolbarButton icon={<Sparkles size={18} />} label="Summary" onClick={() => openSummary()} />
      <ToolbarButton
        icon={resolved === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        label="切换主题"
        onClick={() => toggle()}
      />
      <ToolbarButton
        icon={<span className="text-xs font-bold">⌘F</span>}
        label="搜索"
        onClick={() => openSearch()}
      />
      <ToolbarButton
        icon={<span className="text-xs font-bold">⌘E</span>}
        label="导出"
        onClick={() => openExport()}
      />
    </motion.div>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:opacity-80"
      style={{ color: 'var(--text)' }}
      title={label}
    >
      {icon}
    </button>
  );
}

function LayoutSelector({
  value,
  onChange,
}: {
  value: 'force' | 'tree' | 'dendrogram';
  onChange: (v: 'force' | 'tree' | 'dendrogram') => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <LayoutGrid size={16} style={{ color: 'var(--text-muted)' }} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as 'force' | 'tree' | 'dendrogram')}
        className="text-sm bg-transparent outline-none cursor-pointer"
        style={{ color: 'var(--text)' }}
      >
        <option value="force">力导向</option>
        <option value="tree">树状</option>
        <option value="dendrogram">脉络</option>
      </select>
    </div>
  );
}
