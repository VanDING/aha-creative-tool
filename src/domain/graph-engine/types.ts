/**
 * AHA Graph Engine — Core Type Definitions
 *
 * Zero external dependencies. Pure TypeScript domain model for the
 * creative-idea graph: nodes, edges, clusters, branches, and G6 adapters.
 */

/** Lifecycle state of a thought node. */
export type NodeStatus = 'active' | 'archived' | 'main-branch';

/** Semantic type of a graph edge. */
export type EdgeType = 'ai-suggested' | 'user-confirmed' | 'main-path';

/** 2D canvas coordinate. */
export interface Position {
  /** X coordinate on the canvas. */
  x: number;
  /** Y coordinate on the canvas. */
  y: number;
}

/** A single creative idea captured as a node. */
export interface ThoughtNode {
  /** Stable unique identifier (usually a slugified timestamp + title). */
  id: string;
  /** Short human-readable title derived from content. */
  title: string;
  /** Full Markdown content of the idea. */
  content: string;
  /** Creation timestamp (ISO-8601). */
  createdAt: string;
  /** Last update timestamp (ISO-8601). */
  updatedAt: string;
  /** Current lifecycle state. */
  status: NodeStatus;
  /** User or AI assigned tags. */
  tags: string[];
  /** Optional fixed position on the canvas. */
  position?: Position;
  /** Extensible metadata (source, confidence, author, etc.). */
  metadata: Record<string, unknown>;
}

/** Connection between two thought nodes. */
export interface Edge {
  /** Stable unique identifier. */
  id: string;
  /** Source node id. */
  sourceId: string;
  /** Target node id. */
  targetId: string;
  /** Semantic type of the connection. */
  type: EdgeType;
  /** Optional human-readable label. */
  label?: string;
  /** Optional confidence score for AI-suggested edges (0..1). */
  confidence?: number;
}

/** An edge proposed by the AI association scanner. */
export interface AISuggestedEdge extends Edge {
  type: 'ai-suggested';
  /** Confidence score (0..1). */
  confidence: number;
  /** Human-readable reason for the association. */
  reason: string;
}

/** A cluster of semantically related nodes. */
export interface Cluster {
  /** Stable unique identifier. */
  id: string;
  /** Human-readable cluster label. */
  label: string;
  /** Node ids belonging to the cluster. */
  nodeIds: string[];
  /** Optional theme color (hex). */
  color?: string;
}

/** A user-marked main branch / solution path. */
export interface MainBranch {
  /** Stable unique identifier. */
  id: string;
  /** User-given name for this branch (e.g. "情感主线方案"). */
  name: string;
  /** Ordered node ids from root to leaf. */
  nodeIds: string[];
  /** Creation timestamp (ISO-8601). */
  createdAt: string;
}

/** An archived (pruned) branch with user-supplied reason. */
export interface ArchivedBranch {
  /** Original node id that was archived. */
  nodeId: string;
  /** Reason supplied by the user when pruning. */
  reason: string;
  /** Timestamp of archival (ISO-8601). */
  archivedAt: string;
}

/** Complete in-memory graph representation used by the domain layer. */
export interface GraphData {
  /** All nodes in the graph. */
  nodes: ThoughtNode[];
  /** User-confirmed and main-path edges. */
  edges: Edge[];
  /** AI-identified theme clusters. */
  clusters: Cluster[];
  /** AI-proposed associations (rendered as dashed edges). */
  aiSuggestions: AISuggestedEdge[];
  /** User-marked main branches. */
  mainBranches: MainBranch[];
  /** Archived branches (kept for provenance). */
  archivedBranches?: ArchivedBranch[];
}

/** G6 v5 compatible node data shape. */
export interface G6NodeData {
  id: string;
  data?: ThoughtNode;
  style?: Record<string, unknown>;
  states?: string[];
}

/** G6 v5 compatible edge data shape. */
export interface G6EdgeData {
  id?: string;
  source: string;
  target: string;
  data?: Edge;
  style?: Record<string, unknown>;
  states?: string[];
}

/** G6 v5 compatible combo data shape (used for clusters). */
export interface G6ComboData {
  id: string;
  data?: Cluster;
  style?: Record<string, unknown>;
  states?: string[];
}

/** G6 v5 compatible graph data shape produced by `toG6Format`. */
export interface G6GraphData {
  nodes: G6NodeData[];
  edges: G6EdgeData[];
  combos?: G6ComboData[];
}
