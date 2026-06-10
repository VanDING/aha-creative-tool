import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore, useTemporalStore } from './appStore';
import { buildGraphData, createNode } from '@domain/graph-engine/GraphEngine';

describe('appStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      mode: 'aha',
      currentProjectPath: null,
      ahaInputBuffer: '',
      recentNodeIds: [],
      graphData: buildGraphData([]),
      selectedNodeId: null,
      hoveredNodeId: null,
      activeLayoutType: 'force',
      isExtending: false,
      extensionStream: null,
      isSummaryOpen: false,
      isExportOpen: false,
      isAISettingsOpen: false,
      isSearchOpen: false,
      notifications: [],
    });
    useTemporalStore().getState().clear();
  });

  it('adds a node and updates graphData', () => {
    const node = createNode('Idea');
    useAppStore.getState().addNode(node);
    expect(useAppStore.getState().graphData.nodes).toHaveLength(1);
    expect(useAppStore.getState().recentNodeIds).toContain(node.id);
  });

  it('selects and deselects nodes', () => {
    useAppStore.getState().selectNode('n1');
    expect(useAppStore.getState().selectedNodeId).toBe('n1');
    useAppStore.getState().selectNode(null);
    expect(useAppStore.getState().selectedNodeId).toBeNull();
  });

  it('archives a node and clears selection', () => {
    const node = createNode('Old');
    useAppStore.getState().addNode(node);
    useAppStore.getState().selectNode(node.id);
    useAppStore.getState().archiveNode(node.id, 'outdated');
    expect(useAppStore.getState().graphData.nodes[0].status).toBe('archived');
    expect(useAppStore.getState().selectedNodeId).toBeNull();
  });

  it('supports undo/redo via temporal', () => {
    const node = createNode('Test');
    useAppStore.getState().addNode(node);
    expect(useAppStore.getState().graphData.nodes).toHaveLength(1);
    useTemporalStore().getState().undo();
    expect(useAppStore.getState().graphData.nodes).toHaveLength(0);
    useTemporalStore().getState().redo();
    expect(useAppStore.getState().graphData.nodes).toHaveLength(1);
  });
});
