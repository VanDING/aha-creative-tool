import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { ProviderConfig, ModelConfig } from '@infrastructure/ai/types';

const PROVIDER_TEMPLATES = [
  { name: 'OpenAI', protocol: 'openai-compatible' as const, baseURL: 'https://api.openai.com/v1' },
  {
    name: 'DeepSeek',
    protocol: 'openai-compatible' as const,
    baseURL: 'https://api.deepseek.com/v1',
  },
  {
    name: 'Ollama (本地)',
    protocol: 'openai-compatible' as const,
    baseURL: 'http://localhost:11434/v1',
  },
  {
    name: '智谱 AI',
    protocol: 'openai-compatible' as const,
    baseURL: 'https://open.bigmodel.cn/api/paas/v4',
  },
  {
    name: '通义千问',
    protocol: 'openai-compatible' as const,
    baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  },
  {
    name: 'OpenRouter',
    protocol: 'openai-compatible' as const,
    baseURL: 'https://openrouter.ai/api/v1',
  },
  { name: 'Anthropic', protocol: 'anthropic' as const, baseURL: 'https://api.anthropic.com/v1' },
];

export interface ProviderEditorProps {
  onSave: (provider: ProviderConfig) => void;
}

export function ProviderEditor({ onSave }: ProviderEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [templateIdx, setTemplateIdx] = useState(0);
  const [id, setId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [modelId, setModelId] = useState('');
  const [modelName, setModelName] = useState('');

  const template = PROVIDER_TEMPLATES[templateIdx];

  const handleSave = () => {
    const providerId = id.trim() || template.name.toLowerCase().replace(/\s+/g, '-');
    const models: ModelConfig[] = [];
    if (modelId.trim()) {
      models.push({
        id: modelId.trim(),
        name: modelName.trim() || modelId.trim(),
        capabilities: {
          streaming: true,
          structuredOutput: true,
          maxContextTokens: 128000,
          maxOutputTokens: 4096,
        },
      });
    }

    onSave({
      id: providerId,
      name: template.name,
      protocol: template.protocol,
      baseURL: template.baseURL,
      apiKeyRef: apiKey ? providerId : undefined,
      models,
      enabled: true,
    });

    setId('');
    setApiKey('');
    setModelId('');
    setModelName('');
    setIsExpanded(false);
  };

  return (
    <div>
      {!isExpanded ? (
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors w-full justify-center"
          style={{
            backgroundColor: 'var(--color-aha-ai-light)',
            color: 'var(--color-aha-ai)',
          }}
        >
          <Plus size={16} />
          添加供应商
        </button>
      ) : (
        <div
          className="p-4 rounded-xl space-y-3"
          style={{
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
          }}
        >
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
              供应商模板
            </label>
            <select
              value={templateIdx}
              onChange={(e) => setTemplateIdx(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
              style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
            >
              {PROVIDER_TEMPLATES.map((t, i) => (
                <option key={t.name} value={i}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                自定义 ID
              </label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder={template.name.toLowerCase().replace(/\s+/g, '-')}
                className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                模型 ID
              </label>
              <input
                type="text"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                placeholder="gpt-4o"
                className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                显示名称
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="GPT-4o"
                className="w-full px-3 py-2 rounded-lg text-sm bg-transparent outline-none"
                style={{ color: 'var(--text)', border: '1px solid var(--border)' }}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-medium"
              style={{
                backgroundColor: 'var(--accent)',
                color: '#fff',
              }}
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-medium"
              style={{
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
