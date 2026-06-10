# zundo Reference Documentation

- **npm**: https://www.npmjs.com/package/zundo
- **GitHub**: https://github.com/charkour/zundo
- **Version**: v2.3.0 (supports Zustand v5)
- **Install**: `npm i zundo`
- **Size**: <700B

## Basic Usage

```ts
import { create } from 'zustand';
import { temporal } from 'zundo';

interface StoreState {
  bears: number;
  increase: () => void;
}

const useStore = create<StoreState>()(
  temporal((set) => ({
    bears: 0,
    increase: () => set((state) => ({ bears: state.bears + 1 })),
  }))
);

// Access undo/redo
const { undo, redo, clear, pastStates, futureStates, isTracking, pause, resume } =
  useStore.temporal.getState();
```

## Configuration Options

```ts
temporal(
  (set) => ({ /* store */ }),
  {
    // Track only specific fields (reduces memory)
    partialize: (state) => {
      const { graphData } = state;
      return { graphData };
    },

    // Limit history size (discard oldest)
    limit: 50,

    // Prevent duplicate snapshots
    equality: (pastState, currentState) =>
      isDeepEqual(pastState, currentState),

    // Store diffs instead of full state
    diff: (pastState, currentState) => {
      // return difference object, or null to skip tracking
      return { /* diff */ };
    },

    // Throttle/debounce state recording
    handleSet: (handleSet) =>
      throttle<typeof handleSet>((state) => {
        handleSet(state);
      }, 1000),

    // Persist undo history
    wrapTemporal: (storeInitializer) =>
      persist(storeInitializer, { name: 'temporal-persist' }),
  }
);
```

## Key Methods (from `useStore.temporal.getState()`)

| Method/Property | Description |
|----------------|-------------|
| `undo(steps?)` | Undo N steps (default 1) |
| `redo(steps?)` | Redo N steps (default 1) |
| `clear()` | Clear all history (irreversible) |
| `pastStates` | Array of past states |
| `futureStates` | Array of future states |
| `isTracking` | `boolean` — whether tracking is active |
| `pause()` | Pause history tracking |
| `resume()` | Resume history tracking |
| `setOnSave(fn)` | Callback when temporal store updates |

## For AHA: Example Integration

```ts
const useStore = create<AppState>()(
  temporal(
    (set) => ({
      mode: 'aha',
      graphData: null,
      selectedNodeId: null,

      setMode: (mode) => set({ mode }),
      selectNode: (id) => set({ selectedNodeId: id }),
      moveNode: (id, pos) => set((s) => ({
        graphData: updateNodePos(s.graphData, id, pos)
      })),
      addEdge: (source, target) => set((s) => ({
        graphData: addConnection(s.graphData, source, target)
      })),
      archiveNode: (id, reason) => set((s) => ({
        graphData: markArchived(s.graphData, id, reason)
      })),
    }),
    {
      partialize: (state) => ({ graphData: state.graphData }),
      limit: 50,
    }
  )
);
```

## Notes

- "Dispatching a new state will clear all of the future states."
- `undo()` and `redo()` are always callable in v2 (never undefined).
- For reactive subscription to `pastStates`/`futureStates`, use
  `useStoreWithEqualityFn` from `zustand/traditional`.
- Zustand v5 support from v2.3.0+.
