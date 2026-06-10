/**
 * AHA Zen Mode — G6 v5 Graph Canvas
 *
 * Renders the graph from appStore.graphData and supports:
 * - Force-directed layout
 * - Node drag
 * - Canvas zoom / pan
 * - fitView on first render
 * - Click-to-select nodes
 * - Right-click context menu on nodes
 */

import { useEffect, useRef } from 'react';
import { Graph } from '@antv/g6';
import type { Graph as G6Graph } from '@antv/g6';
import { useAppStore } from '@presentation/stores/appStore';
import { toG6Format } from '@domain/graph-engine/GraphEngine';

export interface GraphCanvasProps {
  /** Callback when a node is clicked. */
  onNodeClick?: (nodeId: string) => void;
  /** Callback when a node is right-clicked. */
  onNodeContextMenu?: (nodeId: string, x: number, y: number) => void;
}

export function GraphCanvas({ onNodeClick, onNodeContextMenu }: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<G6Graph | null>(null);
  const graphData = useAppStore((state) => state.graphData);
  const selectNode = useAppStore((state) => state.selectNode);

  // Initialize G6 graph once.
  useEffect(() => {
    if (!containerRef.current) return;

    const graph = new Graph({
      container: containerRef.current,
      autoFit: 'view',
      data: { nodes: [], edges: [] },
      layout: {
        type: 'force',
        linkDistance: 120,
        nodeStrength: -200,
        edgeStrength: 0.2,
        collide: { padding: 20 },
      },
      node: {
        type: 'circle',
        style: {
          labelFill: '#1a1a1a',
          labelFontSize: 12,
          labelOffsetY: 8,
          cursor: 'pointer',
        },
      },
      edge: {
        type: 'line',
        style: {
          endArrow: true,
          endArrowSize: 6,
        },
      },
      behaviors: [
        'drag-canvas',
        'zoom-canvas',
        'drag-element',
        {
          type: 'click-select',
          multiple: false,
          trigger: ['click'],
        } as never,
      ],
      plugins: ['minimap'],
      animation: {
        duration: 300,
        easing: 'ease-in-out-sine',
      },
    });

    graphRef.current = graph;

    graph.on('node:click', (evt: unknown) => {
      const event = evt as { target?: { id?: string }; targetType?: string };
      const targetId = event.target?.id;
      if (targetId) {
        selectNode(targetId);
        onNodeClick?.(targetId);
      }
    });

    graph.on('node:contextmenu', (evt: unknown) => {
      const event = evt as {
        target?: { id?: string };
        clientX?: number;
        clientY?: number;
      };
      const targetId = event.target?.id;
      if (targetId && event.clientX != null && event.clientY != null) {
        onNodeContextMenu?.(targetId, event.clientX, event.clientY);
      }
    });

    graph.on('canvas:click', () => {
      selectNode(null);
    });

    graph.render().catch((err: Error) => {
      console.error('Graph render failed:', err);
    });

    const handleResize = () => {
      graph.resize();
      graph.fitView();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      graph.destroy();
      graphRef.current = null;
    };
  }, [selectNode, onNodeClick, onNodeContextMenu]);

  // Sync graph data whenever store changes.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const g6Data = toG6Format(graphData);
    // Cast to G6's internal GraphData shape; our G6GraphData is structurally compatible.
    graph.setData(g6Data as never);
    graph.render().catch((err: Error) => {
      console.error('Graph update failed:', err);
    });
  }, [graphData]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: 'transparent' }}
      data-testid="graph-canvas"
    />
  );
}
