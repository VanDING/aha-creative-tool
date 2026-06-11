import { Settings } from 'lucide-react';
import { useAppStore } from '@presentation/stores/appStore';

export function SettingsEntry() {
  const openAISettings = useAppStore((s) => s.openAISettings);

  return (
    <button
      onClick={openAISettings}
      className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide transition-opacity hover:opacity-70"
      style={{ color: 'var(--text-muted)' }}
      title="AI 设置"
    >
      <Settings size={14} />
      <span>设置</span>
    </button>
  );
}
