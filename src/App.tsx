import { AnimatePresence } from 'motion/react';
import { AhaMode } from '@presentation/components/AhaMode/AhaMode';
import { ZenMode } from '@presentation/components/ZenMode/ZenMode';
import { ModeSwitch } from '@presentation/components/common/ModeSwitch';
import { useAppStore } from '@presentation/stores/appStore';

function App() {
  const mode = useAppStore((state) => state.mode);
  const setMode = useAppStore((state) => state.setMode);

  return (
    <div data-mode={mode} style={{ width: '100vw', height: '100vh' }}>
      <ModeSwitch mode={mode} onSwitch={setMode} />
      <AnimatePresence mode="wait">
        {mode === 'aha' ? <AhaMode key="aha" /> : <ZenMode key="zen" />}
      </AnimatePresence>
    </div>
  );
}

export default App;
