import { AIService } from '@application/services/AIService';
import { useAppStore } from '@presentation/stores/appStore';

export function AIStatusBar() {
  const nodeCount = useAppStore((s) => s.graphData.nodes.length);
  const aiSuggestionsCount = useAppStore((s) => s.graphData.aiSuggestions.length);
  const isConfigured = AIService.getInstance().isConfigured;

  if (!isConfigured) {
    return (
      <span className="text-[11px] font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>
        AI 未配置
      </span>
    );
  }

  if (nodeCount === 0) {
    return (
      <span className="text-[11px] font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>
        等待第一个想法
      </span>
    );
  }

  return (
    <span className="text-[11px] font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>
      {nodeCount} 个节点
      {aiSuggestionsCount > 0 && (
        <span className="ml-2" style={{ color: 'var(--suggested)' }}>
          {aiSuggestionsCount} 组关联
        </span>
      )}
    </span>
  );
}
