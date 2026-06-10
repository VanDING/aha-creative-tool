/**
 * AHA Global Application State — Zustand + zundo
 *
 * Tracks UI mode, current project, graph data, and selection state.
 * zundo records only `graphData` changes for undo/redo.
 */

import { create } from 'zustand';
import { temporal } from 'zundo';
import type { GraphData, ThoughtNode, Position } from '@domain/graph-engine/types';
import {
  buildGraphData,
  addEdge as graphAddEdge,
  removeEdge as graphRemoveEdge,
  removeNode as graphRemoveNode,
  archiveBranch as graphArchiveBranch,
  markAsMainBranch as graphMarkAsMainBranch,
} from '@domain/graph-engine/GraphEngine';

export type AppMode = 'aha' | 'zen';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface AppState {
  // Mode
  mode: AppMode;

  // Current project
  currentProjectPath: string | null;

  // Aha mode state
  ahaInputBuffer: string;
  recentNodeIds: string[];

  // Zen mode state
  graphData: GraphData;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  activeLayoutType: 'force' | 'tree' | 'dendrogram';

  // AI extension state
  isExtending: boolean;
  extensionStream: string | null;

  // UI state
  isSummaryOpen: boolean;
  isExportOpen: boolean;
  isAISettingsOpen: boolean;
  isSearchOpen: boolean;

  // Notifications
  notifications: Notification[];
}

export interface AppActions {
  setMode: (mode: AppMode) => void;
  setCurrentProjectPath: (path: string | null) => void;
  setAhaInputBuffer: (value: string) => void;
  setGraphData: (graphData: GraphData) => void;
  addNode: (node: ThoughtNode) => void;
  moveNode: (nodeId: string, position: Position) => void;
  selectNode: (nodeId: string | null) => void;
  hoverNode: (nodeId: string | null) => void;
  addEdge: (sourceId: string, targetId: string, type: 'user-confirmed' | 'main-path') => void;
  removeEdge: (edgeId: string) => void;
  removeNode: (nodeId: string) => void;
  archiveNode: (nodeId: string, reason: string) => void;
  markMainBranch: (nodeId: string, name: string) => void;
  setLayoutType: (type: AppState['activeLayoutType']) => void;
  setExtensionStream: (stream: string | null) => void;
  setIsExtending: (value: boolean) => void;
  openSummary: () => void;
  closeSummary: () => void;
  openExport: () => void;
  closeExport: () => void;
  openAISettings: () => void;
  closeAISettings: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  dismissNotification: (id: string) => void;
}

const emptyGraphData = buildGraphData([], [], [], [], []);

export const useAppStore = create<AppState & AppActions>()(
  temporal(
    (set) => ({
      // Initial state
      mode: 'aha',
      currentProjectPath: null,
      ahaInputBuffer: '',
      recentNodeIds: [],
      graphData: emptyGraphData,
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

      // Actions
      setMode: (mode) => set({ mode }),
      setCurrentProjectPath: (currentProjectPath) => set({ currentProjectPath }),
      setAhaInputBuffer: (ahaInputBuffer) => set({ ahaInputBuffer }),
      setGraphData: (graphData) => set({ graphData }),
      addNode: (node) =>
        set((state) => ({
          graphData: buildGraphData(
            [...state.graphData.nodes, node],
            state.graphData.edges,
            state.graphData.clusters,
            state.graphData.aiSuggestions,
            state.graphData.mainBranches,
            state.graphData.archivedBranches || [],
          ),
          recentNodeIds: [node.id, ...state.recentNodeIds].slice(0, 20),
        })),
      moveNode: (nodeId, position) =>
        set((state) => ({
          graphData: buildGraphData(
            state.graphData.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
            state.graphData.edges,
            state.graphData.clusters,
            state.graphData.aiSuggestions,
            state.graphData.mainBranches,
            state.graphData.archivedBranches || [],
          ),
        })),
      selectNode: (selectedNodeId) => set({ selectedNodeId }),
      hoverNode: (hoveredNodeId) => set({ hoveredNodeId }),
      addEdge: (sourceId, targetId, type) =>
        set((state) => ({
          graphData: graphAddEdge(state.graphData, sourceId, targetId, type),
        })),
      removeEdge: (edgeId) =>
        set((state) => ({
          graphData: graphRemoveEdge(state.graphData, edgeId),
        })),
      removeNode: (nodeId) =>
        set((state) => ({
          graphData: graphRemoveNode(state.graphData, nodeId),
          selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        })),
      archiveNode: (nodeId, reason) =>
        set((state) => ({
          graphData: graphArchiveBranch(state.graphData, nodeId, reason),
          selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
        })),
      markMainBranch: (nodeId, name) =>
        set((state) => ({
          graphData: graphMarkAsMainBranch(state.graphData, nodeId, name),
        })),
      setLayoutType: (activeLayoutType) => set({ activeLayoutType }),
      setExtensionStream: (extensionStream) => set({ extensionStream }),
      setIsExtending: (isExtending) => set({ isExtending }),
      openSummary: () => set({ isSummaryOpen: true }),
      closeSummary: () => set({ isSummaryOpen: false }),
      openExport: () => set({ isExportOpen: true }),
      closeExport: () => set({ isExportOpen: false }),
      openAISettings: () => set({ isAISettingsOpen: true }),
      closeAISettings: () => set({ isAISettingsOpen: false }),
      openSearch: () => set({ isSearchOpen: true }),
      closeSearch: () => set({ isSearchOpen: false }),
      addNotification: (notification) =>
        set((state) => ({
          notifications: [
            ...state.notifications,
            { ...notification, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
          ],
        })),
      dismissNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),
    }),
    {
      partialize: (state) => ({ graphData: state.graphData }),
      limit: 50,
    },
  ),
);

/** Helper to access temporal controls for undo/redo. */
export function useTemporalStore() {
  return useAppStore.temporal;
}
