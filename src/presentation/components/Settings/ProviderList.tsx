import { Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { useAISettingsStore } from '@presentation/stores/aiSettingsStore';

export function ProviderList() {
  const providers = useAISettingsStore((state) => state.providers);
  const removeProvider = useAISettingsStore((state) => state.removeProvider);

  if (providers.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
        已配置供应商
      </h3>
      {providers.map((provider) => (
        <div
          key={provider.id}
          className="flex items-center justify-between px-3 py-2 rounded-xl"
          style={{
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
          }}
        >
          <div className="min-w-0">
            <div className="font-medium text-sm truncate" style={{ color: 'var(--text)' }}>
              {provider.name}
            </div>
            <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
              {provider.baseURL}
            </div>
            <div className="flex items-center gap-1 mt-1">
              {provider.enabled ? (
                <CheckCircle2 size={12} style={{ color: '#22c55e' }} />
              ) : (
                <XCircle size={12} style={{ color: '#ef4444' }} />
              )}
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {provider.enabled ? '已启用' : '已禁用'} · {provider.models.length} 个模型
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => removeProvider(provider.id)}
            className="p-2 rounded-lg transition-colors hover:opacity-70 ml-2"
            style={{ color: '#ef4444' }}
            title="删除"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
