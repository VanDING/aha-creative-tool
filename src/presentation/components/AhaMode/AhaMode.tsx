import { motion } from 'motion/react';
import { CardFlow } from './CardFlow';
import { ChatView } from '../common/ChatView';
import { AIStatusBar } from '../common/AIStatusBar';
import { SettingsEntry } from '../common/SettingsEntry';
import { useAIChat } from '@presentation/hooks/useAIChat';
import { useAppStore } from '@presentation/stores/appStore';
import { useChatStore } from '@presentation/stores/chatStore';
import { applicationService } from '@application/services/ApplicationService';
import { AIService } from '@application/services/AIService';

export function AhaMode() {
  const { send, cancel } = useAIChat();
  const addNode = useAppStore((s) => s.addNode);
  const projectPath = useAppStore((s) => s.currentProjectPath);

  const handleSend = async (content: string) => {
    // 1. Create nodes from the input
    const nodes = await applicationService.handleNewThoughts(content, projectPath);
    for (const node of nodes) {
      addNode(node);
    }

    // 2. Add user message to chat (send will also add one, but we want the node-created version)
    if (nodes.length > 0) {
      useChatStore.getState().addMessage({
        role: 'user',
        content,
      });
    }

    // 3. Trigger AI association scan (background)
    const ai = AIService.getInstance();
    if (ai.isConfigured) {
      const state = useAppStore.getState();
      for (const node of nodes) {
        void ai.scanAssociationsForNode(node, state.graphData).then((associations) => {
          if (associations.length > 0) {
            const currentState = useAppStore.getState();
            const aiSuggestions = associations.map((a) => ({
              id: `ais-${node.id}-${a.nodeBId}-${Date.now()}`,
              sourceId: node.id,
              targetId: a.nodeBId,
              type: 'ai-suggested' as const,
              confidence: a.strength,
              reason: a.reason,
              label: a.reason,
            }));
            useAppStore.setState({
              graphData: {
                ...currentState.graphData,
                aiSuggestions: [
                  ...currentState.graphData.aiSuggestions,
                  ...aiSuggestions,
                ],
              },
            });
          }
        });
      }
    }

    // 4. Send to AI
    void send(content, 'aha-ai');
  };

  return (
    <motion.div
      className="flex w-full h-full overflow-hidden"
      style={{ backgroundColor: 'var(--bg)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Left: Chat */}
      <motion.div
        className="h-full flex flex-col"
        style={{ width: '45%', borderRight: '1px solid var(--border)' }}
        layout
      >
        <ChatView
          persona="aha-ai"
          personaColor="#C4884A"
          personaName="AHA-AI"
          onSend={handleSend}
          onCancel={cancel}
        />
      </motion.div>

      {/* Right: Card Flow */}
      <div className="h-full flex flex-col" style={{ width: '55%' }}>
        <CardFlow />
        <div
          className="shrink-0 px-4 py-2.5 flex items-center justify-between"
          style={{
            backgroundColor: 'var(--surface-elevated)',
            borderTop: '1px solid var(--border)',
          }}
        >
          <SettingsEntry />
          <AIStatusBar />
        </div>
      </div>
    </motion.div>
  );
}
