import { AnimatePresence, motion } from 'motion/react';
import { AhaMode } from '@presentation/components/AhaMode/AhaMode';
import { ZenMode } from '@presentation/components/ZenMode/ZenMode';
import { ModeSwitch } from '@presentation/components/common/ModeSwitch';
import { AISettingsModal } from '@presentation/components/Settings/AISettingsModal';
import { useAppStore } from '@presentation/stores/appStore';
import { useThemeEffect } from '@presentation/stores/themeStore';

function App() {
  const mode = useAppStore((s) => s.mode);
  const setMode = useAppStore((s) => s.setMode);
  const isAISettingsOpen = useAppStore((s) => s.isAISettingsOpen);

  useThemeEffect();

  return (
    <div data-mode={mode} style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <ModeSwitch mode={mode} onSwitch={setMode} />
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          style={{ width: '100%', height: '100%' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
        >
          {mode === 'aha' ? <AhaMode /> : <ZenMode />}
        </motion.div>
      </AnimatePresence>
      <AISettingsModal
        isOpen={isAISettingsOpen}
        onClose={useAppStore.getState().closeAISettings}
      />
    </div>
  );
}

export default App;
