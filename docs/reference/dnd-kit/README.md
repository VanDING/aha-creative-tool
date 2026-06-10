# dnd-kit Reference Documentation

- **GitHub**: https://github.com/clauderic/dnd-kit
- **Latest release**: April 2026 (active)
- **Install**: `npm i @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
- **Stars**: 17.2K
- **License**: MIT

## Quick Start

```tsx
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable item
function SortableItem({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {id}
    </div>
  );
}

// Container
function SortableList({ items, onReorder }) {
  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {items.map((id) => <SortableItem key={id} id={id} />)}
      </SortableContext>
    </DndContext>
  );
}
```

## Key Concepts

- **DndContext** — Root provider. Handles sensors, collision detection, modifiers
- **Sensors** — Input detection: `useSensor(usePointer)`, `useSensor(useKeyboard)`, `useSensor(useTouch)`
- **Collision Detection** — `closestCenter`, `rectIntersection`, `pointerWithin`
- **dragOverlay** — Custom drag preview via `<DragOverlay>`

## For AHA

dnd-kit is needed only for **non-graph UI interactions** — AHA's graph canvas uses G6's built-in drag. dnd-kit handles:
- NodeStack reordering in Aha mode
- Settings panel drag-to-reorder
- Any modal/list drag interactions

G6 handles: node dragging, canvas panning, edge creation within the graph — NOT dnd-kit.

## Compatibility

- React 18: ✅ fully supported
- React 19: ⚠️ support status being tracked (issue #1511)
- TypeScript: ✅ first-class types
- Mobile/Touch: ✅ via `@dnd-kit/touch` sensor
- Accessibility: ✅ via `@dnd-kit/accessibility`
