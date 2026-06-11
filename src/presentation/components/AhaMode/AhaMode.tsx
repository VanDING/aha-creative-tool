import { motion } from 'motion/react';
import { QuickInput } from './QuickInput';
import { MobileQuickInput } from './MobileQuickInput';
import { CardFlow } from './CardFlow';
import { ChatView } from '../common/ChatView';
import { AIStatusBar } from '../common/AIStatusBar';
import { SettingsEntry } from '../common/SettingsEntry';
import { useMediaQuery } from '@presentation/hooks/useMediaQuery';
import { useAIChat } from '@presentation/hooks/useAIChat';

export function AhaMode() {
  const isMobile = useMediaQuery('(max-width: 640px)');
  const { send, cancel } = useAIChat();

  const handleSend = (content: string) => {
    send(content, 'aha-ai');
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
        className="h-full border-r"
        style={{ width: '50%', borderColor: 'var(--border)' }}
        layout
      >
        <ChatView
          persona="aha-ai"
          personaColor="#f59e0b"
          personaName="AHA-AI"
          onSend={handleSend}
          onCancel={cancel}
        />
      </motion.div>

      {/* Right: Card Flow + Quick Input */}
      <div className="h-full flex flex-col" style={{ width: '50%' }}>
        <CardFlow />
        <div className="relative">
          {isMobile ? <MobileQuickInput /> : <QuickInput />}
        </div>
      </div>

      <AIStatusBar />
      <SettingsEntry />
    </motion.div>
  );
}
