import { AIService } from '@application/services/AIService';
import { useAppStore } from '@presentation/stores/appStore';

export function AIStatusBar() {
  const nodeCount = useAppStore((s) => s.graphData.nodes.length);
  const aiSuggestionsCount = useAppStore((s) => s.graphData.aiSuggestions.length);
  const isConfigured = AIService.getInstance().isConfigured;

  if (!isConfigured) {
    return (
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs z-30"
        style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
      >
        配置 AI 后，你的想法将自动产生关联
      </div>
    );
  }

  if (nodeCount === 0) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs z-30"
      style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
    >
      AI 已分析 {nodeCount} 个节点
      {aiSuggestionsCount > 0 && `，发现 ${aiSuggestionsCount} 组潜在关联`}
    </div>
  );
}
