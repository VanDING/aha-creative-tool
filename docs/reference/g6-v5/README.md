# G6 v5 Reference Documentation

- **Official docs**: https://g6.antv.antgroup.com/en/manual/introduction
- **GitHub**: https://github.com/antvis/G6
- **Version**: v5.x (active as of 2026-06)
- **Install**: `npm i @antv/g6`

## Key API Summary

### Graph Constructor

```ts
import { Graph } from '@antv/g6';

const graph = new Graph({
  container: 'container-id',
  width: 800,
  height: 600,
  data: { nodes: [], edges: [], combos: [] },
  layout: { type: 'force' },
  node: { type: 'circle', style: { fill: '#fff', stroke: '#000' } },
  edge: { type: 'line', style: { stroke: '#999' } },
  behaviors: ['drag-canvas', 'drag-element', 'zoom-canvas'],
  plugins: ['minimap', 'toolbar'],
  animation: true,
  autoFit: 'view',
  theme: 'light',
});
```

### GraphData Format

```ts
interface GraphData {
  nodes: NodeData[];
  edges: EdgeData[];
  combos?: ComboData[];
}

interface NodeData {
  id: string;           // unique
  type?: string;        // circle, rect, diamond, image, HTML, ...
  data?: object;        // custom data accessible in style callbacks
  style?: object;       // { fill, stroke, lineWidth, r, labelText, ... }
  states?: string[];    // initial states: 'selected', 'activated', ...
  combo?: string;       // parent combo ID
  children?: string[];  // child node IDs (tree graphs)
}

interface EdgeData {
  source: string;
  target: string;
  id?: string;
  type?: string;        // line, cubic, polyline, quadratic, ...
  data?: object;
  style?: object;       // { stroke, lineWidth, endArrow, lineDash, ... }
  states?: string[];
}

interface ComboData {
  id: string;
  type?: string;        // circle-combo, rect-combo
  data?: object;
  style?: object;
  states?: string[];
  combo?: string;       // parent combo ID
}
```

### Layouts (20+ available)

`force`, `dendrogram`, `mindmap`, `dagre`, `antv-dagre`, `circular`, `compact-box`, `concentric`, `d3-force`, `d3-force3d`, `fishbone`, `force-atlas2`, `fruchterman`, `grid`, `indented`, `mds`, `radial`, `random`, `snake`, `combo-combined`, `custom`

### Behaviors (15 available)

`zoom-canvas`, `drag-canvas`, `drag-element`, `drag-element-force`, `scroll-canvas`, `brush-select`, `click-select`, `lasso-select`, `hover-activate`, `collapse-expand`, `create-edge`, `focus-element`, `fix-element-size`, `auto-adapt-label`, `optimize-viewport-transform`

### Plugins (19 available)

`background`, `bubblesets`, `contextmenu`, `edge-bundling`, `edge-filter-lens`, `fisheye`, `fullscreen`, `grid-line`, `history`, `hull`, `legend`, `minimap`, `snapline`, `timebar`, `title`, `toolbar`, `tooltip`, `watermark`, `custom`

### Key Graph Methods

- `graph.setData(data)` / `graph.addData(data)` / `graph.updateData(data)` / `graph.removeData(ids)`
- `graph.render()` / `graph.destroy()`
- `graph.fitView()` / `graph.zoomTo(zoom)` / `graph.focusItem(id)`
- `graph.setItemState(id, state, enabled)`
- `graph.getData()` / `graph.getElementData(id)`
- `graph.on('event', handler)` / `graph.off('event', handler)`

### v5 Key Differences from v4

- WebGPU + WASM computation acceleration
- 3D scenes support
- React/Vue/Angular component-based node definition
- New shape architecture ("Composite Shape")
- Rich plugin ecosystem (19 plugins vs fewer in v4)
- Multi-layer rendering (background, main, label, transient)
- New animation system with AnimationEffectTiming

### Framework Integration

- React: `@antv/graphin` — declarative React components for G6
- Direct React node: Define nodes with React components
- Direct Vue node: Define nodes with Vue components
- Angular: Supported via integration docs
