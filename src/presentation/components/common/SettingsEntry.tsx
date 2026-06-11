import { Settings } from 'lucide-react';
import { useAppStore } from '@presentation/stores/appStore';

export function SettingsEntry() {
  const openAISettings = useAppStore((s) => s.openAISettings);

  return (
    <button
      onClick={openAISettings}
      className="fixed bottom-4 left-4 z-50 p-2 rounded-full transition-colors hover:opacity-80"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      title="AI 设置"
    >
      <Settings size={18} />
    </button>
  );
}
