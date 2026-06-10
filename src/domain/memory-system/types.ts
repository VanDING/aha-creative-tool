import type { ThoughtNode } from '../graph-engine/types';

export interface CoreMemory {
  projectGoal: string;
  constraints: string[];
  currentMainBranchId?: string;
  keyDecisions: Array<{
    timestamp: string;
    decision: string;
    reason: string;
    alternatives: string[];
  }>;
  projectType: string;
}

export interface L2Context {
  focusNode: ThoughtNode;
  parentNodes: ThoughtNode[];
  childNodes: ThoughtNode[];
  recentlyActivated: ThoughtNode[];
  relatedClusters: Array<{ id: string; label: string; nodeIds: string[] }>;
}
