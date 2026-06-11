import { useCallback } from 'react';
import { ChatView } from '../common/ChatView';
import { useAIChat } from '@presentation/hooks/useAIChat';
import { useAppStore } from '@presentation/stores/appStore';

export function ZenChatView() {
  const { send, cancel } = useAIChat();
  const selectedNodeId = useAppStore((s) => s.selectedNodeId);
  const graphData = useAppStore((s) => s.graphData);

  const selectedNode = selectedNodeId
    ? graphData.nodes.find((n) => n.id === selectedNodeId)
    : null;

  const contextLabel = selectedNode
    ? `节点: ${selectedNode.title}`
    : '整体脉络';

  const handleSend = useCallback(
    (content: string) => {
      // If a node is selected, prepend context hint
      if (selectedNode) {
        const contextualContent = `[关于节点「${selectedNode.title}」] ${content}`;
        send(contextualContent, 'zen-ai');
      } else {
        send(content, 'zen-ai');
      }
    },
    [selectedNode, send],
  );

  return (
    <ChatView
      persona="zen-ai"
      personaColor="#3b82f6"
      personaName="ZEN-AI"
      onSend={handleSend}
      onCancel={cancel}
      contextLabel={contextLabel}
    />
  );
}
