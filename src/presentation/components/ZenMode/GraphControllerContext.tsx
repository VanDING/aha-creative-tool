/**
 * GraphControllerContext — lets toolbar and other siblings
 * drive the G6 graph instance owned by GraphCanvas.
 */

import { createContext, useContext, useState, useCallback } from 'react';
import type { Graph as G6Graph } from '@antv/g6';

export interface GraphController {
  /** The underlying G6 graph instance, when mounted. */
  graph: G6Graph | null;
  /** Zoom in by 20 %. */
  zoomIn: () => void;
  /** Zoom out by 20 %. */
  zoomOut: () => void;
  /** Fit the graph contents into view. */
  fitView: () => void;
}

interface GraphControllerRegistration extends GraphController {
  register: (graph: G6Graph) => void;
  unregister: () => void;
}

const GraphControllerContext = createContext<GraphControllerRegistration | null>(null);

export function GraphControllerProvider({ children }: { children: React.ReactNode }) {
  const [graph, setGraph] = useState<G6Graph | null>(null);

  const register = useCallback((g: G6Graph) => setGraph(g), []);
  const unregister = useCallback(() => setGraph(null), []);

  const zoomIn = useCallback(() => {
    if (graph) void graph.zoomBy(1.2);
  }, [graph]);

  const zoomOut = useCallback(() => {
    if (graph) void graph.zoomBy(0.8);
  }, [graph]);

  const fitView = useCallback(() => {
    if (graph) void graph.fitView();
  }, [graph]);

  return (
    <GraphControllerContext.Provider
      value={{ graph, zoomIn, zoomOut, fitView, register, unregister }}
    >
      {children}
    </GraphControllerContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGraphController(): GraphControllerRegistration {
  const ctx = useContext(GraphControllerContext);
  if (!ctx) {
    throw new Error('useGraphController must be used within GraphControllerProvider');
  }
  return ctx;
}
