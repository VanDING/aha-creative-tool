/**
 * AHA Zen Mode — G6 v5 Graph Canvas
 *
 * Renders the graph from appStore.graphData and supports:
 * - Force-directed / tree / dendrogram layouts
 * - Node drag, canvas zoom / pan, fitView
 * - Click-to-select and right-click context menu
 * - Hover and selected states
 * - Dark-mode-aware labels
 */

import { useEffect, useRef } from 'react';
import { Graph } from '@antv/g6';
import type { Graph as G6Graph } from '@antv/g6';
import { useAppStore } from '@presentation/stores/appStore';
import { useThemeStore } from '@presentation/stores/themeStore';
import { useGraphController } from './GraphControllerContext';
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
  const hoverNode = useAppStore((state) => state.hoverNode);
  const selectedNodeId = useAppStore((state) => state.selectedNodeId);
  const hoveredNodeId = useAppStore((state) => state.hoveredNodeId);
  const activeLayoutType = useAppStore((state) => state.activeLayoutType);
  const resolvedTheme = useThemeStore((state) => state.resolved);
  const { register, unregister } = useGraphController();

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
          labelFontSize: 12,
          labelOffsetY: 8,
          cursor: 'pointer',
        },
        state: {
          selected: {
            lineWidth: 4,
            stroke: resolvedTheme === 'dark' ? '#7ec8e3' : '#d4a574',
            shadowColor: resolvedTheme === 'dark' ? '#7ec8e3' : '#d4a574',
            shadowBlur: 10,
          },
          hover: {
            lineWidth: 3,
            stroke: resolvedTheme === 'dark' ? '#7ec8e3' : '#d4a574',
          },
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
    register(graph);

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

    graph.on('node:mouseenter', (evt: unknown) => {
      const event = evt as { target?: { id?: string } };
      const targetId = event.target?.id;
      if (targetId) hoverNode(targetId);
    });

    graph.on('node:mouseleave', () => {
      hoverNode(null);
    });

    void graph.render();

    const handleResize = () => {
      graph.resize();
      void graph.fitView();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      unregister();
      graph.destroy();
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectNode, hoverNode, onNodeClick, onNodeContextMenu, register, unregister]);

  // Sync graph data whenever store changes.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    const g6Data = toG6Format(graphData, { dark: resolvedTheme === 'dark' });
    // Cast to G6's internal GraphData shape; our G6GraphData is structurally compatible.
    graph.setData(g6Data as never);
    void graph.render();
  }, [graphData, resolvedTheme]);

  // React to layout type changes.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    graph.setLayout({
      type: activeLayoutType,
      ...(activeLayoutType === 'force'
        ? { linkDistance: 120, nodeStrength: -200, edgeStrength: 0.2, collide: { padding: 20 } }
        : {}),
    } as never);
    void graph.render();
  }, [activeLayoutType]);

  // Apply selection / hover states.
  useEffect(() => {
    const graph = graphRef.current;
    if (!graph) return;

    for (const node of graphData.nodes) {
      void graph.setElementState(node.id, []);
    }
    if (selectedNodeId) {
      void graph.setElementState(selectedNodeId, 'selected');
    }
    if (hoveredNodeId && hoveredNodeId !== selectedNodeId) {
      void graph.setElementState(hoveredNodeId, 'hover');
    }
  }, [selectedNodeId, hoveredNodeId, graphData]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ background: 'transparent' }}
      data-testid="graph-canvas"
    />
  );
}
